# ChefNote — 디자인 시스템 / 브랜드 가이드

> **모든 UI · 프롬프트 작업은 이 문서를 기준으로 한다.**
> 새 컴포넌트/페이지를 만들 때 항상 이 토큰과 톤을 참조할 것.

## 한 줄 컨셉

**"주방 한구석에 굴러다니는 손때 묻은 메모지"**

- 그리드는 **깔끔**하게, 디테일은 살짝 **messy**
- 마스킹 테이프, 손그림 doodle, 살짝 기울어진 카드, 종이 질감
- 너무 튕기지 않는 **ease-out** 애니메이션 (Framer Motion)

## 영감 레퍼런스

- **와릿이즌(What it isNt) · 마크 곤잘레스** 손그림 감성
- **Apple Notes**의 따뜻함

## 컬러 토큰 (`tailwind.config.ts`)

| 토큰 | HEX | 용도 |
|---|---|---|
| `cream` | `#FAF6EE` | 배경 (종이) |
| `olive` | `#5C6E3F` | 브랜드 그린 / 줄노트 선 |
| `chili` | `#D94B2B` | 강조 / CTA 포인트 |
| `yolk` | `#F4C95D` | 하이라이트 / 손그림·마스킹 테이프 |
| `ink` | `#1A1A1A` | 본문 텍스트 |

## 타이포그래피

- **본문/제목**: Pretendard — `font-sans` (layout.tsx에서 `pretendard-dynamic-subset.css` 로컬 import)
- **손글씨 악센트**: Caveat — `font-handwrite` (next/font/google, `--font-caveat`). 메모/doodle 텍스트에만 소량 사용.

## 유틸리티

- `.paper-lines` — 줄노트 종이 배경 (`repeating-linear-gradient`, olive 15%). globals.css 정의.

## 모션 (Framer Motion)

- 기본 ease: `[0.22, 1, 0.36, 1]` (부드러운 ease-out, 바운스 X)
- 등장: `opacity 0→1` + `y 14~36px→0`, stagger delay 0.1~0.15s
- 카드/테이프는 살짝 기울임(rotate 2~3deg)으로 손맛

## 톤 규칙

- 슬로건/카피는 **짧고 담백하게**. 과장 X.
- **가짜 사회적 증거 금지** — 별점·"N만 학생" 같은 거짓 지표 절대 사용 안 함 (신규 서비스이므로 정직하게).
- 손그림·테이프·기울임은 **"양념"처럼 소량**. 그리드 자체는 정돈된 상태 유지.
- 메인 슬로건: **"녹음만 하세요. 노트는 완성돼 있어요."**

## 스택

- Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion
- 폰트: Pretendard(local) + Caveat(google)
- 위치: `chef-note/web/` (기존 PWA 앱 `chef-note/`(루트)와 분리 — 라이브 앱 보호)
