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
        primary: {
          DEFAULT: "#0f766e",
          light: "#14b8a6",
          dark: "#0b5751"
        },
        admin: {
          DEFAULT: "#3730a3",
          light: "#4f46e5",
          dark: "#241e6b"
        }
      },
      boxShadow: {
        xs: "0 1px 2px rgba(16, 24, 40, 0.05)",
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 1px rgba(16, 24, 40, 0.03)",
        elevated: "0 8px 24px -8px rgba(16, 24, 40, 0.16), 0 2px 6px rgba(16, 24, 40, 0.06)",
        popover: "0 16px 40px -12px rgba(16, 24, 40, 0.22)"
      }
    }
  },
  plugins: []
};

export default config;
