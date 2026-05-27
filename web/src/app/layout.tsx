import type { Metadata } from "next";
import "./globals.css";

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
      <head>
        {/* 폰트: CDN 방식 (빌드 아티팩트에 포함 안 됨) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/pretendard-dynamic-subset.css"
          rel="stylesheet"
        />
        {/* Google Analytics 4 — G-XXXXXXXXXX 자리에 실제 측정 ID 입력 */}
        {/* GA4 콘솔(analytics.google.com) → 관리 → 데이터 스트림 → 웹 스트림에서 확인 */}
        {/* <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script> */}
        {/* <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-XXXXXXXXXX');` }} /> */}
      </head>
      <body className="font-sans bg-cream text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
