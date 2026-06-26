import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        border: "#d9dee7",
        ink: "#172033",
        muted: "#667085",
        surface: "#f6f7f9",
        primary: "#0f766e"
      }
    }
  },
  plugins: []
};

export default config;
