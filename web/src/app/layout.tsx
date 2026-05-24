import type { Metadata } from "next";
import { Caveat } from "next/font/google";
import "pretendard/dist/web/static/pretendard-dynamic-subset.css";
import "./globals.css";

// 손글씨 악센트 (메모/doodle 텍스트 전용) — font-handwrite
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChefNote — 녹음만 하면 노트는 완성돼 있어요",
  description:
    "조리과 학생을 위한 AI 수업 노트. 수업을 녹음하면 재료·조리 순서·교수님 팁까지 자동으로 정리됩니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${caveat.variable} font-sans bg-cream text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
