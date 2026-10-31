export type CurriculumTableBlock = { type: "table"; rows: string[][] };
export function isTeacherOnlyText(value: string): boolean;
export function filterStudentTable(block: CurriculumTableBlock): CurriculumTableBlock | null;
