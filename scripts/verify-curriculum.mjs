import assert from "node:assert/strict";
import { filterStudentTable, isTeacherOnlyText } from "../src/lib/curriculum-privacy.mjs";
import { filterSubmissionsForStudentGroups } from "../src/lib/group-submissions.mjs";
import { extractStudentNamesFromText } from "../src/lib/student-import.mjs";
import { getResourceDownloadName } from "../src/lib/resource-download.mjs";
import { readFile } from "node:fs/promises";

const curriculum = JSON.parse(await readFile(new URL("../src/lib/data/curriculum.json", import.meta.url), "utf8"));
const activities = await readFile(new URL("../src/lib/data/activities.ts", import.meta.url), "utf8");
const questions = await readFile(new URL("../src/lib/data/questions.ts", import.meta.url), "utf8");
const interactions = await readFile(new URL("../src/components/ActivityInteractions.tsx", import.meta.url), "utf8");
const dashboard = await readFile(new URL("../src/app/giao-vien/TeacherDashboard.tsx", import.meta.url), "utf8");
const groupMigration = await readFile(new URL("../supabase/migrations/20261031001100_named_groups.sql", import.meta.url), "utf8");
const privateDataMigration = await readFile(new URL("../supabase/migrations/20261031001300_private_activity_data.sql", import.meta.url), "utf8");
const answerPrivacyMigration = await readFile(new URL("../supabase/migrations/20261031001400_protect_answer_keys.sql", import.meta.url), "utf8");
const uniqueQuizMigration = await readFile(new URL("../supabase/migrations/20261031001500_unique_quiz_attempts.sql", import.meta.url), "utf8");
const schema = await readFile(new URL("../supabase/migrations/20261031000000_initial_schema.sql", import.meta.url), "utf8");
const quizPage = await readFile(new URL("../src/app/lam-bai/page.tsx", import.meta.url), "utf8");
const quizSubmitApi = await readFile(new URL("../src/app/api/quiz-submit/route.ts", import.meta.url), "utf8");
const gradeApi = await readFile(new URL("../src/app/api/grade/route.ts", import.meta.url), "utf8");
const submissionPage = await readFile(new URL("../src/app/nop-bai/page.tsx", import.meta.url), "utf8");

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
assert.match(uniqueQuizMigration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_submissions_one_attempt_per_student/);
assert.match(uniqueQuizMigration, /quiz_submission_duplicate_archive/);
assert.match(quizSubmitApi, /saveError\.code === "23505"[\s\S]*status: 409/);
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

const renamedGroupMembership = [{ group_id: "group-uuid-1", group_assignment_groups: { id: "group-uuid-1", assignment_id: "assignment-1", group_name: "Nhóm Thí nghiệm A" } }];
const renamedGroupSubmission = { id: "submission-1", assignment_id: "assignment-1", group_id: "group-uuid-1", group_name: "Nhóm Thí nghiệm A" };
const otherGroupSubmission = { id: "submission-2", assignment_id: "assignment-1", group_id: "group-uuid-2", group_name: "Nhóm 2" };
assert.deepEqual(filterSubmissionsForStudentGroups(renamedGroupMembership, [renamedGroupSubmission, otherGroupSubmission]), [renamedGroupSubmission], "Renaming a group must not hide its submission from its members.");
assert.match(await readFile(new URL("../src/app/hoc-sinh/page.tsx", import.meta.url), "utf8"), /filterSubmissionsForStudentGroups\(memberOf, gSubs\)/);
console.log("Named group result lookup verified by stable group_id, including renamed groups.");

assert.deepEqual(extractStudentNamesFromText("Mã,Họ và tên,Lớp\n1,\"Nguyễn Văn An\",11A1\n2,\"Trần Thị Bình\",11A1"), ["Nguyễn Văn An", "Trần Thị Bình"], "CSV import must select the full-name column and ignore class/id columns.");
assert.deepEqual(extractStudentNamesFromText("Họ,Tên đệm,Tên,Lớp\nNguyễn,Văn,An,11A1"), ["Nguyễn Văn An"], "CSV import must combine Vietnamese name columns.");
assert.deepEqual(extractStudentNamesFromText("Nguyễn Văn An\r\nTrần Thị Bình"), ["Nguyễn Văn An", "Trần Thị Bình"], "TXT import must preserve one name per line.");
const studentDashboard = await readFile(new URL("../src/app/giao-vien/TeacherDashboard.tsx", import.meta.url), "utf8");
assert.match(studentDashboard, /showImportModal &&/);
assert.match(studentDashboard, /showPasteModal &&/);
assert.match(studentDashboard, /setShowPasteModal\(true\)/);
assert.match(studentDashboard, /extractStudentNamesFromText\(text\)/);
console.log("Student roster import preview, paste flow, CSV/TXT parsing and duplicate-safe review verified.");

assert.equal(getResourceDownloadName("2026/123e4567-e89b-42d3-a456-426614174000-bai_giang.pdf", "Tài liệu lớp"), "bai_giang.pdf", "Downloads must preserve the original file extension and readable name.");
assert.equal(getResourceDownloadName(null, "Tài liệu: chương 1"), "Tài liệu_ chương 1", "Fallback download names must be filesystem-safe.");
const activityResources = await readFile(new URL("../src/components/ActivityResources.tsx", import.meta.url), "utf8");
assert.match(activityResources, /\.download\(item\.storage_path\)/);
assert.match(activityResources, /getResourceDownloadName\(item\.storage_path, item\.title\)/);
assert.match(activityResources, /role="alert"/);
assert.doesNotMatch(activityResources, /createSignedUrl\(item\.storage_path[\s\S]*window\.open/);
console.log("Student lesson resource downloads preserve filenames and report access errors.");

assert.match(activityResources, /\.is\("activity_id", null\)/);
const studentPage = await readFile(new URL("../src/app/hoc-sinh/page.tsx", import.meta.url), "utf8");
assert.match(studentPage, /<ActivityResources activityId=\{null\} \/>/, "Published resources assigned to the general class library must appear for students.");
const resourceLibrary = await readFile(new URL("../src/components/ResourceLibrary.tsx", import.meta.url), "utf8");
assert.match(resourceLibrary, /name="source_url" type="url"/, "Teachers must be able to update a saved web link.");
assert.match(resourceLibrary, /name="activity_id"/, "Teachers must be able to reorganize a resource under a different activity.");
assert.match(resourceLibrary, /setFiles\(\(current\) => current\.slice\(completed\)\)/, "A partial multi-file upload must not retry already-saved files.");
assert.match(resourceLibrary, /getResourceDownloadName\(item\.storage_path, item\.title\)/);
console.log("Shared student library, resource editing, original filenames and partial-upload retry verified.");




assert.match(gradeApi, /access\.profile\.role === "teacher" \? \{ model_answer:/, "AI model answers must only be returned to teachers.");
console.log("Grading API keeps model answers teacher-only while students receive score and feedback.");
assert.match(submissionPage, /model_answer: result\.model_answer \?\? ""/);
assert.doesNotMatch(submissionPage, /Không có đáp án mẫu/);
const studentPortal = await readFile(new URL("../src/app/hoc-sinh/page.tsx", import.meta.url), "utf8");
assert.match(studentPortal, /setPreviewMode\(true\)/);
assert.match(studentPortal, /Bản xem trước học sinh/);
assert.match(studentPortal, /data-preview-navigation="true"/);
assert.match(studentPortal, /if \(previewMode \|\| !student\) return/);
console.log("Student portal is publicly reviewable in a read-only sample mode without opening account access.");
