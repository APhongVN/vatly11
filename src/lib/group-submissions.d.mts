export type StudentGroupMembership = { group_id?: string | null; group_assignment_groups?: { id?: string | null } | null };
export type GroupSubmissionReference = { group_id?: string | null };
export function filterSubmissionsForStudentGroups<T extends GroupSubmissionReference>(members: StudentGroupMembership[], submissions: T[]): T[];
