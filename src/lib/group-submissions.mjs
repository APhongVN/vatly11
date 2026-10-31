export function filterSubmissionsForStudentGroups(members, submissions) {
  const groupIds = new Set(members.map((member) => member.group_id || member.group_assignment_groups?.id).filter(Boolean));
  return submissions.filter((submission) => submission.group_id && groupIds.has(submission.group_id));
}
