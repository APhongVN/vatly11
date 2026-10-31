const INDEPENDENT_VARIABLES = new Set(["", "U", "Q", "S"]);
const DEPENDENT_VARIABLES = new Set(["", "Q", "U", "C"]);
const CONTROL_VARIABLES = new Set(["S", "d", "epsilon"]);

export function isValidQUVariablePlan(value, complete) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const { independent, dependent, controls } = value;
  if (!INDEPENDENT_VARIABLES.has(independent) || !DEPENDENT_VARIABLES.has(dependent)) return false;
  if (!Array.isArray(controls) || controls.length > CONTROL_VARIABLES.size
    || controls.some((item) => typeof item !== "string" || !CONTROL_VARIABLES.has(item))
    || new Set(controls).size !== controls.length) return false;
  if (!complete) return true;
  return independent === "U" && dependent === "Q"
    && controls.length === CONTROL_VARIABLES.size
    && [...CONTROL_VARIABLES].every((name) => controls.includes(name));
}
