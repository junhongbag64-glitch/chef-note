/** @type {import('next').NextConfig} */
const nextConfig = {
  // 정적 HTML 익스포트 → Cloudflare Pages / Vercel / 어디든 배포 가능
  output: 'export',
  // 이미지 최적화는 정적 익스포트에서 비활성화 필요
  images: { unoptimized: true },
};

export default nextConfig;
