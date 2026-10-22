/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        status: {
          locked: "#9CA3AF",
          active: "#3B82F6",
          done: "#10B981",
          review: "#F59E0B",
        },
      },
    },
  },
  plugins: [],
};