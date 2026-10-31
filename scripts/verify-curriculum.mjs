import assert from "node:assert/strict";
import { filterStudentTable, isTeacherOnlyText } from "../src/lib/curriculum-privacy.mjs";
import { readFile } from "node:fs/promises";

const curriculum = JSON.parse(await readFile(new URL("../src/lib/data/curriculum.json", import.meta.url), "utf8"));
const activities = await readFile(new URL("../src/lib/data/activities.ts", import.meta.url), "utf8");
const questions = await readFile(new URL("../src/lib/data/questions.ts", import.meta.url), "utf8");
const interactions = await readFile(new URL("../src/components/ActivityInteractions.tsx", import.meta.url), "utf8");
const dashboard = await readFile(new URL("../src/app/giao-vien/TeacherDashboard.tsx", import.meta.url), "utf8");
const groupMigration = await readFile(new URL("../supabase/migrations/20261031001100_named_groups.sql", import.meta.url), "utf8");
const privateDataMigration = await readFile(new URL("../supabase/migrations/20261031001300_private_activity_data.sql", import.meta.url), "utf8");
const answerPrivacyMigration = await readFile(new URL("../supabase/migrations/20261031001400_protect_answer_keys.sql", import.meta.url), "utf8");
const schema = await readFile(new URL("../supabase/migrations/20261031000000_initial_schema.sql", import.meta.url), "utf8");
const quizPage = await readFile(new URL("../src/app/lam-bai/page.tsx", import.meta.url), "utf8");
const quizSubmitApi = await readFile(new URL("../src/app/api/quiz-submit/route.ts", import.meta.url), "utf8");

assert.equal(curriculum.length, 11, "The merged course must contain 11 web activities.");
assert.deepEqual(curriculum.map(({ id }) => id), [1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14]);
assert.equal(curriculum.reduce((sum, activity) => sum + activity.sourceSections.length, 0), 14, "All 14 source sections must be preserved.");
assert.deepEqual(curriculum.find(({ id }) => id === 8).sourceSections.map((section) => Number(section.match(/^HOẠT ĐỘNG (\d+)/)?.[1])), [8, 9, 10, 11]);
assert.equal((questions.match(/id: "G\d+"/g) || []).length, 16, "Capacitor Challenge must contain 16 questions.");
assert.equal((questions.match(/id: "R\d+"/g) || []).length, 10, "Readiness quiz must contain 10 scored questions.");
assert.deepEqual([...activities.matchAll(/\bid: (\d+),/g)].map(([, id]) => Number(id)), [1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14]);
assert.doesNotMatch(activities, /^\s*(?:model_answer|grading_rubric):/m, "Teacher answers and rubrics must not ship in public activity data.");
assert.match(activities, /title: "Các thí nghiệm liên quan đến tụ điện"/);
assert.match(interactions, /Các mục 8, 9, 10 và 11 đã gộp/);
assert.match(dashboard, /Sửa tên/);
assert.match(groupMigration, /ADD COLUMN IF NOT EXISTS group_name/);
assert.match(groupMigration, /sync_group_submission_name/);
assert.match(privateDataMigration, /REVOKE SELECT ON public\.activities FROM anon/);
assert.match(answerPrivacyMigration, /DROP COLUMN grading_rubric/);
assert.match(answerPrivacyMigration, /DROP COLUMN correct_option/);
assert.match(answerPrivacyMigration, /LEFT JOIN public\.quiz_question_keys[\s\S]*WHERE true ON CONFLICT/);
assert.match(answerPrivacyMigration, /REVOKE INSERT, UPDATE, DELETE ON public\.quiz_submissions FROM authenticated/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS public\.activity_grading_guides/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS public\.quiz_question_keys/);
assert.doesNotMatch(quizPage, /correct_option|explanation/, "Student quiz pages must not load answer keys.");
assert.match(quizSubmitApi, /createSupabaseAdminClient/);
assert.doesNotMatch(quizSubmitApi, /return NextResponse\.json\(\{ score,.*correct/i, "Quiz API must not return the answer key.");


const sourceQuestionTable = curriculum.flatMap(({ blocks }) => blocks).find((block) => block.type === "table" && block.rows.some((row) => row[0] === "Mã câu" && row[1] === "PRE01-Q1"));
assert.ok(sourceQuestionTable, "The student source question table must exist.");
const safeQuestionTable = filterStudentTable(sourceQuestionTable);
assert.ok(safeQuestionTable, "Student question tables must stay visible.");
assert.ok(safeQuestionTable.rows.some((row) => row[0] === "Câu hỏi"), "Student prompts must remain visible.");
assert.ok(!safeQuestionTable.rows.some((row) => row[0] === "Đáp án/ý chính"), "Teacher answers must be removed from student source tables.");
assert.equal(isTeacherOnlyText("Đáp án/ý chính"), true, "Teacher answer labels must be hidden.");
assert.equal(isTeacherOnlyText("Tiêu chí"), false, "A generic word must not hide unrelated student content.");

const rubricTable = curriculum.flatMap(({ blocks }) => blocks).find((block) => block.type === "table" && block.rows[0]?.includes("Trọng số"));
assert.ok(rubricTable, "The source document must include the expected rubric table.");
assert.equal(filterStudentTable(rubricTable), null, "A teacher scoring rubric must be hidden in full.");
const keyedQuestionTable = curriculum.flatMap(({ blocks }) => blocks).find((block) => block.type === "table" && block.rows[0]?.includes("Đáp án chuẩn"));
assert.ok(keyedQuestionTable, "A keyed review table must exist in the source document.");
const safeKeyedQuestionTable = filterStudentTable(keyedQuestionTable);
assert.ok(safeKeyedQuestionTable, "Review questions should remain available to students.");
assert.ok(!safeKeyedQuestionTable.rows[0].some((cell) => /đáp án/i.test(cell)), "Answer columns must be removed.");

const sampleTaskTable = curriculum.flatMap(({ blocks }) => blocks).find((block) => block.type === "table" && block.rows[0]?.includes("Nhiệm vụ mẫu"));
assert.ok(sampleTaskTable, "The source document must include sample student tasks.");
const safeSampleTaskTable = filterStudentTable(sampleTaskTable);
assert.ok(safeSampleTaskTable, "Sample student tasks must remain visible.");
assert.ok(safeSampleTaskTable.rows[0].includes("Nhiệm vụ mẫu"), "Student task column must remain visible after answer filtering.");
assert.ok(!safeSampleTaskTable.rows[0].some((cell) => /đáp án|tiêu chí/i.test(cell)), "Sample answer/rubric columns must be removed.");
const privateParagraphs = curriculum.flatMap(({ blocks }) => blocks).filter((block) => block.type === "paragraph" && isTeacherOnlyText(block.text));
assert.ok(privateParagraphs.length > 0, "Teacher-only rubric headings must be detected.");
let privateTableCount = 0;
for (const block of curriculum.flatMap(({ blocks }) => blocks).filter((item) => item.type === "table")) {
  const safe = filterStudentTable(block);
  if (!safe) { privateTableCount += 1; continue; }
  assert.ok(!safe.rows[0].some((cell) => /đáp án|rubric|trọng số|thang điểm|mức đạt|điểm tối đa|lỗi\/quan niệm cần gắn tag|phản hồi ai mẫu/i.test(cell)), "Answer and scoring columns must not reach student pages.");
  assert.ok(safe.rows.slice(1).every((row) => !isTeacherOnlyText(row[0] || "")), "Teacher-only answer/rubric rows must not reach student pages.");
}
assert.ok(privateTableCount > 0, "Teacher-only tables must be excluded from student content.");
console.log("Curriculum and answer privacy verified: 14 source sections, 11 web activities, 8–11 merged, student prompts preserved, and answer keys/rubrics hidden.");
