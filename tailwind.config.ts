import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1180px",
      },
    },
    extend: {
      fontFamily: {
        heading: ["var(--font-kalam)", "cursive", "sans-serif"],
        body: ["var(--font-patrick)", "cursive", "sans-serif"],
      },
      colors: {
        paper: {
          DEFAULT: "#fdfbf7",
          muted: "#e5e0d8",
          card: "#ffffff",
        },
        pencil: {
          DEFAULT: "#2d2d2d",
          light: "#5c5c5c",
          muted: "#8c8c8c",
        },
        marker: {
          red: "#ff4d4d",
          "red-dark": "#e03e3e",
        },
        pen: {
          blue: "#2d5da1",
          "blue-dark": "#1d447d",
        },
        postit: {
          yellow: "#fff9c4",
          "yellow-dark": "#f7ed94",
        },
        mint: {
          DEFAULT: "#d1fae5",
          dark: "#a7f3d0",
        },
      },
      boxShadow: {
        hard: "4px 4px 0px 0px #2d2d2d",
        "hard-sm": "2px 2px 0px 0px #2d2d2d",
        "hard-lg": "8px 8px 0px 0px #2d2d2d",
        "hard-blue": "4px 4px 0px 0px #2d5da1",
        "hard-red": "4px 4px 0px 0px #ff4d4d",
      },
      borderRadius: {
        wobbly: "255px 15px 225px 15px / 15px 225px 15px 255px",
        "wobbly-md": "20px 255px 20px 255px / 255px 20px 255px 20px",
        "wobbly-lg": "255px 25px 225px 25px / 25px 225px 25px 255px",
        "wobbly-sm": "120px 10px 100px 10px / 10px 100px 10px 120px",
      },
      keyframes: {
        jiggle: {
          "0%, 100%": { transform: "rotate(-1deg)" },
          "50%": { transform: "rotate(1deg)" },
        },
        bounce_gentle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        jiggle: "jiggle 2s ease-in-out infinite",
        bounce_gentle: "bounce_gentle 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
