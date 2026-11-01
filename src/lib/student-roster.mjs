const normalize = (value) => String(value ?? "").normalize("NFC").trim().toLocaleLowerCase("vi");

export function hasStudentInClass(students, fullName, className) {
  const nameKey = normalize(fullName);
  const classKey = normalize(className);
  if (!nameKey || !classKey) return false;
  return students.some((student) => normalize(student.full_name) === nameKey && normalize(student.class_name) === classKey);
}

export function getStudentClassNames(students) {
  const classesByKey = new Map();
  for (const student of students) {
    const className = String(student.class_name ?? "").normalize("NFC").trim();
    const classKey = normalize(className);
    if (classKey && !classesByKey.has(classKey)) classesByKey.set(classKey, className);
  }
  return [...classesByKey.values()].sort((left, right) => left.localeCompare(right, "vi", { sensitivity: "base", numeric: true }));
}

export function filterStudentRoster(students, classFilter = "", searchTerm = "") {
  const query = normalize(searchTerm);
  const selectedClass = normalize(classFilter);
  return students.filter((student) =>
    (!selectedClass || normalize(student.class_name) === selectedClass)
    && (!query || normalize(student.full_name).includes(query)),
  );
}