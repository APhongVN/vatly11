import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextVitals,
  // Async Supabase loaders called from effects are external reads, not render loops.
  { rules: { "react-hooks/set-state-in-effect": "off" } },
  { ignores: [".next/**", "node_modules/**", "coverage/**"] },
];
