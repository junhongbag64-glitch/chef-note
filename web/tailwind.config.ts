import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── ChefNote 브랜드 토큰 (DESIGN.md 참조) ──
        cream: "#FAF6EE", // 배경 (종이)
        olive: "#5C6E3F", // 브랜드 그린 / 줄노트 선
        chili: "#D94B2B", // 강조 / CTA 포인트
        yolk: "#F4C95D", // 하이라이트 / 손그림·테이프
        ink: "#1A1A1A", // 본문 텍스트
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["Pretendard", "sans-serif"],
        handwrite: ["var(--font-caveat)", "Caveat", "cursive"],
      },
    },
  },
  plugins: [],
};
export default config;
