const EPSILON_0 = 8.854e-12;
export type CapacitorState = {
  S: number; d: number; epsilonR: number; U: number; C: number; Q: number; sourceConnected: boolean;
};
export function calculateCapacitance(S: number, d: number, epsilonR: number = 1): number {
  return (EPSILON_0 * epsilonR * S) / d;
}
export function calculateCharge(C: number, U: number): number {
  return C * U;
}
export function calculateEnergy(C: number, U: number): number {
  return 0.5 * C * U * U;
}
export function calculateEnergyFromQ(Q: number, C: number): number {
  return (Q * Q) / (2 * C);
}
export function createState(S: number, d: number, epsilonR: number, U: number, sourceConnected: boolean): CapacitorState {
  const C = calculateCapacitance(S, d, epsilonR);
  const Q = calculateCharge(C, U);
  return { S, d, epsilonR, U, C, Q, sourceConnected };
}
export function updateGeometry(state: CapacitorState, newS: number, newD: number, newEpsilonR: number): CapacitorState {
  const newC = calculateCapacitance(newS, newD, newEpsilonR);
  if (state.sourceConnected) {
    return { ...state, S: newS, d: newD, epsilonR: newEpsilonR, C: newC, Q: newC * state.U };
  } else {
    return { ...state, S: newS, d: newD, epsilonR: newEpsilonR, C: newC, U: state.Q / newC };
  }
}
export function setVoltage(state: CapacitorState, newU: number): CapacitorState {
  if (!state.sourceConnected) return state;
  return { ...state, U: newU, Q: state.C * newU };
}
export function disconnectSource(state: CapacitorState): CapacitorState {
  return { ...state, sourceConnected: false };
}
export function connectSource(state: CapacitorState, sourceU: number): CapacitorState {
  return { ...state, sourceConnected: true, U: sourceU, Q: state.C * sourceU };
}