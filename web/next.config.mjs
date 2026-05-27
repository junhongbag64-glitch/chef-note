/** @type {import('next').NextConfig} */
const nextConfig = {
  // 정적 HTML 익스포트 → GitHub Pages 배포
  output: 'export',
  // GitHub Pages 에서 /terms/, /privacy/ 등 경로 인식을 위해 필요
  // terms/index.html 형태로 생성 → GitHub Pages가 /terms/ 로 서빙
  trailingSlash: true,
  // 이미지 최적화는 정적 익스포트에서 비활성화 필요
  images: { unoptimized: true },
};

export default nextConfig;
