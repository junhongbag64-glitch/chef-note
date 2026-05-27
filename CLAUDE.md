# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 구조

```
chef-note/          ← GitHub Pages 루트 (chefnote.kr)
  index.html        ← 랜딩 페이지 (web/out/에서 빌드 후 복사)
  _next/            ← Next.js 빌드 산출물 (web/out/_next/에서 복사)
  app/              ← PWA 앱 (/app/ 경로에서 서빙, 수동 수정)
  sw.js             ← 랜딩용 Service Worker (최소 버전)
  worker.js         ← Cloudflare Worker 백엔드
  web/              ← Next.js 랜딩 페이지 소스
```

## 빌드 & 배포 명령어

**랜딩 페이지 수정 시 (web/ 변경 → 루트에 반영 → GitHub Pages 배포)**
```bash
cd web && npm run build
# 빌드 후 루트에 복사
cp web/out/index.html index.html
rm -rf _next && cp -r web/out/_next _next
git add -A && git commit -m "..." && git push origin main
```

**랜딩 개발 서버**
```bash
cd web && npm run dev   # localhost:3000
```

**Cloudflare Worker 배포** (worker.js 또는 wrangler.toml 변경 시 자동 배포됨)
```bash
npx wrangler deploy     # 수동 배포 시
```

## 중요 규칙

**폰트**: `web/src/app/layout.tsx`에서 Pretendard와 Caveat를 **CDN `<link>` 태그**로 로드함. `next/font/google`이나 `pretendard` npm 패키지 **절대 사용 금지** — 한국어 서브셋 파일 1660개(22MB)가 `_next/static/media/`에 생성되어 GitHub Pages Checkout이 타임아웃됨.

**PWA 앱 경로**: 앱은 `/app/` 하위에 위치. `app/sw.js`의 scope는 `/app/`, `app/manifest.json`의 start_url도 `/app/`. 루트 sw.js는 랜딩 전용 최소 버전.

**GitHub Pages 배포**: push 시 자동으로 "pages build and deployment" 워크플로우가 실행됨. `_next/` 디렉토리가 인식되려면 루트에 `.nojekyll` 파일이 있어야 함.

## 아키텍처 요약

- **랜딩 페이지**: `web/` (Next.js 14, App Router, `output: 'export'`) → 정적 HTML로 빌드 → 루트에 복사 → GitHub Pages(chefnote.kr)
- **PWA 앱**: `app/index.html` (바닐라 JS, Firebase Auth/Firestore/Storage) → `/app/` 경로에서 서빙
- **백엔드**: `worker.js` (Cloudflare Worker) → Firebase idToken 검증 → AssemblyAI STT 프록시 → Claude/Gemini LLM → KV 잡 저장소
- **디자인 규칙**: `web/DESIGN.md` 참조 (컬러 토큰, 타이포 원칙, 톤 가이드)

## 브랜드 핵심 (상세는 web/DESIGN.md)

컬러: `cream #FAF6EE` / `olive #5C6E3F` / `chili #D94B2B` / `yolk #F4C95D` / `ink #1A1A1A`  
폰트: Pretendard(`font-sans`) + Caveat(`font-handwrite`, 액센트 소량만)  
슬로건: "녹음만 하세요. 노트는 완성돼 있어요."  
가짜 지표(별점·사용자 수) 사용 금지.
