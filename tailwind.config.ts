import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["var(--font-inter)",      "system-ui", "-apple-system", "sans-serif"],
        heading: ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          DEFAULT: "#09090F",
          100:     "#111122",
          200:     "#181830",
          300:     "#202040",
        },
        gold: {
          DEFAULT: "#D4A017",
          light:   "#E8C53A",
          dark:    "#B8880E",
        },
      },
      animation: {
        twinkle: "twinkle 4s ease-in-out infinite",
      },
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: "0.05" },
          "50%":      { opacity: "0.4"  },
        },
      },
    },
  },
  plugins: [],
};

export default config;
