"use client";

import { motion } from "framer-motion";
import {
  Logo,
  ChefHat,
  MicDoodle,
  SparkleDoodle,
  NotebookDoodle,
  CurlyArrow,
  Squiggle,
  KnifeDoodle,
  WhiskDoodle,
} from "@/components/doodles";

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: easeOut, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** 섹션 h2 위의 작은 Caveat 아이브로 레이블 */
function Eyebrow({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <p
      className={`text-xs font-semibold uppercase tracking-[0.2em] ${
        light ? "text-cream/50" : "text-chili/80"
      }`}
    >
      {children}
    </p>
  );
}

const STEPS = [
  {
    icon: MicDoodle,
    n: "1",
    title: "수업을 녹음만 해요",
    desc: "손은 식재료에, 귀는 교수님께. 메모하느라 놓치지 말고 실습에만 집중하세요.",
  },
  {
    icon: SparkleDoodle,
    n: "2",
    title: "AI가 정리해요",
    desc: "재료(용량까지)·조리 순서·교수님이 강조한 팁을 알아서 노트로 구조화해요.",
  },
  {
    icon: NotebookDoodle,
    n: "3",
    title: "언제든 꺼내봐요",
    desc: "수업별로 저장되고 검색돼요. 정리 안 된 녹음 파일 더미를 뒤질 필요 없어요.",
  },
];

const FEATURES = [
  ["재료는 용량까지", "버터 30g, 양파 1개처럼 정확하게"],
  ["조리 순서 그대로", "온도·시간·상태 판단 기준까지"],
  ["교수님 팁 캐치", "강조 발언·주의 포인트를 빠짐없이"],
  ["1.5시간 수업도 OK", "긴 실습 통째로 안정 처리"],
  ["폰 녹음앱도", "갤럭시·아이폰 파일 공유로 바로"],
  ["녹음은 안 날아가요", "1초 단위 저장 — 앱이 죽어도 복구"],
];

const TESTIMONIALS = [
  {
    quote:
      "파티시에 실습 끝나고 손에 버터 범벅인데 메모를 어떻게 해요 😂 ChefNote 쓰고 나서 진짜 해방됐어요",
    name: "이○○",
    course: "제과제빵과 2학년",
  },
  {
    quote:
      "베샤멜 소스 비율 맨날 까먹었는데 '버터:밀가루:우유 = 1:1:10' 이렇게 딱 나와요. 교수님 강조 포인트도 다 잡아줘서 진짜 유용해요",
    name: "김○○",
    course: "조리과 1학년",
  },
  {
    quote:
      "1시간 30분 실습 통째로 올렸는데 5분 만에 노트 완성. 솔직히 내가 필기한 것보다 훨씬 잘 정리됐음 ㅋㅋ",
    name: "박○○",
    course: "한식조리과 3학년",
  },
];

const FAQ = [
  [
    "무료인가요?",
    "네, 무료로 시작할 수 있어요. 별도 결제 없이 바로 수업 녹음을 노트로 만들 수 있어요.",
  ],
  [
    "1시간 넘는 수업도 되나요?",
    "네. 1시간 30분이 넘는 실습 수업도 통째로 올려서 정리할 수 있어요. 업로드만 끝나면 앱을 닫아도 백그라운드에서 계속 변환돼요.",
  ],
  [
    "수업 중에 녹음을 못 했어요",
    "괜찮아요. 폰 녹음 앱으로 녹음한 파일을 업로드하거나, '공유'에서 ChefNote로 바로 보내면 돼요.",
  ],
  [
    "노트가 틀릴 수도 있나요?",
    "AI가 듣고 정리해서 100%는 아니에요. 모든 노트는 직접 고칠 수 있으니 중요한 재료·수치는 한 번 확인하는 걸 권해요.",
  ],
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* 줄노트 종이 배경 */}
      <div className="paper-lines pointer-events-none fixed inset-0 opacity-60" />

      {/* ── 상단 내비 ── */}
      <header className="sticky top-0 z-50 border-b border-olive/10 bg-cream/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Logo size="sm" />
          <a
            href="/app/"
            className="rounded-full bg-chili px-4 py-2 text-sm font-semibold text-cream transition-transform hover:scale-[1.04] active:scale-95"
          >
            시작하기
          </a>
        </div>
      </header>

      <main className="relative">
        {/* ── 히어로 ── */}
        <section className="mx-auto flex max-w-2xl flex-col items-center px-6 pb-12 pt-16 text-center sm:pt-24">
          <Reveal>
            <Logo size="lg" />
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-8 flex items-center justify-center gap-2.5 sm:gap-4">
              <KnifeDoodle className="h-7 w-auto -rotate-[18deg] text-ink/25 sm:h-8" />
              {/* 마스킹테이프 정체성 배지 */}
              <div className="inline-flex -rotate-2 items-center gap-1.5 rounded-[4px] bg-yolk px-3.5 py-1.5 shadow-[0_2px_10px_rgba(26,26,26,0.12)]">
                <ChefHat className="h-5 w-5 text-ink/85" />
                <span className="text-sm font-bold tracking-wide text-ink/85">
                  조리과 학생 전용
                </span>
              </div>
              <WhiskDoodle className="h-9 w-auto rotate-[15deg] text-ink/25 sm:h-10" />
            </div>
          </Reveal>

          {/* h1: Pretendard bold — 원래 자연스럽고 좋았던 스타일 */}
          <Reveal delay={0.18}>
            <h1 className="mt-3 text-balance text-5xl font-bold leading-[1.18] sm:text-[3.75rem]">
              녹음만 하세요.
              <br />
              노트는{" "}
              <span className="relative inline-block text-chili">
                완성
                <Squiggle className="absolute -bottom-2 left-0 h-3 w-full text-yolk" />
              </span>
              돼 있어요.
            </h1>
          </Reveal>

          <Reveal delay={0.3}>
            <p className="mx-auto mt-7 max-w-md text-lg leading-relaxed text-ink/65">
              수업을 녹음하면 재료·조리 순서·교수님 팁까지
              <br className="hidden sm:block" />
              AI가 자동으로 정리해줘요.
            </p>
          </Reveal>

          <Reveal delay={0.42}>
            <div className="relative mt-9 inline-block">
              <a
                href="/app/"
                className="inline-flex items-center gap-2 rounded-full bg-chili px-8 py-4 text-base font-semibold text-cream shadow-[0_4px_16px_rgba(217,75,43,0.35)] transition-all hover:scale-[1.03] hover:shadow-[0_6px_20px_rgba(217,75,43,0.45)] active:scale-95"
              >
                지금 시작하기 →
              </a>
              <CurlyArrow className="absolute -right-12 -top-7 h-9 w-14 -scale-x-100 text-ink/35" />
            </div>
          </Reveal>

          {/* 기울어진 노트 카드 */}
          <Reveal delay={0.55} className="mt-16 w-full max-w-sm">
            <div className="relative rotate-2 rounded-2xl border border-olive/15 bg-white p-5 text-left shadow-[0_20px_48px_rgba(26,26,26,0.11)]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-olive">
                실습 · 양식
              </div>
              <div className="mt-1 text-xl font-bold">비프 부르기뇽</div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-ink/35">
                재료
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink/80">
                소고기 양지 600g · 레드와인 500ml · 양파 1개 · 버터 30g
              </p>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink/35">
                조리 순서
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink/80">
                1. 소고기를 3cm 큐브로 썰어 소금·후추 밑간.
                <br />
                2. 센 불에 겉면을 갈색이 나게 시어링.
              </p>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-olive/80">
                교수님 포인트 🔑
              </div>
              <p className="mt-1 text-sm italic text-olive/80">
                &ldquo;와인 산도가 핵심 — 산미 조절이 맛의 차이를 만든다&rdquo;
              </p>
            </div>
          </Reveal>
        </section>

        {/* ── Before / After ── */}
        <section className="mx-auto max-w-4xl px-6 py-24">
          <Reveal className="text-center">
            <Eyebrow>진짜 차이</Eyebrow>
            <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              이 노트랑 작별하세요
            </h2>
            <p className="mt-3 text-ink/55">
              집에서 펼쳐봤더니 무슨 말인지 모르는 그 필기
            </p>
          </Reveal>

          <div className="mt-12 grid items-center gap-6 sm:grid-cols-[1fr_2.5rem_1fr]">
            {/* Before */}
            <Reveal>
              <div className="relative rounded-2xl border-2 border-red-200/70 bg-white p-6 shadow-sm">
                <span className="absolute -top-3.5 left-5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-500">
                  ❌ 수업 중 필기
                </span>
                <div className="space-y-2.5 pt-2 font-handwrite text-ink/65">
                  <p className="-rotate-1 text-[15px]">
                    비프..? 와인 많이? 얼마나??
                  </p>
                  <p className="rotate-0.5 text-[15px] opacity-40 line-through">
                    양파 크게 자르기
                  </p>
                  <p className="-rotate-0.5 text-[15px]">
                    온도 낮게 오래?{" "}
                    <span className="text-red-400">→ 나중에 체크</span>
                  </p>
                  <p className="rotate-1 text-[15px]">소고기 600? 아니면 500? 😵</p>
                  <p className="-rotate-1 text-[13px] text-ink/30">
                    ※ 나중에 다시 물어봐야함
                  </p>
                </div>
                <div className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-400">
                  다음 날 열어보면... 🤯
                </div>
              </div>
            </Reveal>

            {/* 화살표 */}
            <Reveal delay={0.1} className="flex items-center justify-center">
              <span className="text-2xl text-ink/20">→</span>
            </Reveal>

            {/* After */}
            <Reveal delay={0.18}>
              <div className="relative rounded-2xl border-2 border-olive/20 bg-white p-6 shadow-sm">
                <span className="absolute -top-3.5 left-5 rounded-full bg-olive px-3 py-1 text-xs font-bold text-cream">
                  ✨ ChefNote 자동 정리
                </span>
                <div className="pt-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-olive">
                    실습 · 양식
                  </div>
                  <div className="mt-0.5 font-bold">비프 부르기뇽</div>
                  <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-ink/35">
                    재료
                  </div>
                  <p className="mt-0.5 text-sm text-ink/80">
                    소고기 양지 600g · 레드와인 500ml
                    <br />
                    양파 1개 · 버터 30g
                  </p>
                  <div className="mt-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink/35">
                    조리 순서
                  </div>
                  <p className="mt-0.5 text-sm text-ink/80">
                    1. 소고기 3cm 큐브, 소금·후추 밑간
                    <br />
                    2. 센 불에 갈색 나게 시어링 (면당 1분)
                  </p>
                  <div className="mt-2.5 text-[10px] font-semibold uppercase tracking-wider text-olive/80">
                    교수님 포인트 🔑
                  </div>
                  <p className="mt-0.5 text-sm italic text-olive/80">
                    &ldquo;와인 산도가 핵심 — 산미 조절이 맛의 차이&rdquo;
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 작동 방식 ── */}
        <section className="mx-auto max-w-4xl px-6 py-24">
          <Reveal className="text-center">
            <Eyebrow>3단계로 끝</Eyebrow>
            <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              이렇게 작동해요
            </h2>
            <p className="mt-3 text-ink/55">녹음 한 번이면 끝. 나머지는 알아서.</p>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.12}>
                <div className="group relative h-full rounded-2xl border border-olive/12 bg-white p-6 text-center transition-shadow hover:shadow-md">
                  <span className="absolute right-5 top-4 text-3xl font-bold text-ink/12">
                    {s.n}
                  </span>
                  <s.icon className="mx-auto h-12 w-12 text-ink/80" />
                  <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">
                    {s.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── 결과물 / 기능 ── */}
        <section className="mx-auto max-w-4xl px-6 py-24">
          <Reveal className="text-center">
            <Eyebrow>뭐가 달라요</Eyebrow>
            <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              이런 노트가 나와요
            </h2>
            <p className="mt-3 text-ink/55">
              그냥 받아쓰기가 아니라,{" "}
              <span className="font-semibold text-olive">요리 노트</span>로.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-3 sm:grid-cols-2">
            {FEATURES.map(([title, desc], i) => (
              <Reveal key={title} delay={(i % 2) * 0.08}>
                <div className="flex items-start gap-3 rounded-xl border border-olive/10 bg-white px-5 py-4 transition-shadow hover:shadow-sm">
                  <span className="mt-0.5 font-handwrite text-2xl leading-none text-chili">
                    ✓
                  </span>
                  <div>
                    <div className="font-bold">{title}</div>
                    <div className="text-sm text-ink/55">{desc}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── 학생 후기 — 다크 섹션 ── */}
        <section className="bg-ink">
          <div className="mx-auto max-w-4xl px-6 py-24">
            <Reveal className="text-center">
              <Eyebrow light>써보고 하는 말</Eyebrow>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-cream sm:text-4xl">
                이렇게 말해요
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-5 sm:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <Reveal key={i} delay={i * 0.1}>
                  <div className="flex h-full flex-col rounded-2xl border border-cream/10 bg-white/8 p-5 backdrop-blur-sm">
                    <p className="flex-1 text-sm leading-relaxed text-cream/80">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="mt-5 border-t border-cream/10 pt-4">
                      <div className="text-xs font-bold text-cream">{t.name}</div>
                      <div className="text-xs text-cream/40">{t.course}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.35} className="mt-10 text-center">
              <p className="text-sm font-medium tracking-[0.08em] text-cream/40">
                — 베타 테스터 학생들의 진짜 후기
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mx-auto max-w-2xl px-6 py-24">
          <Reveal className="text-center">
            <Eyebrow>뭐든 물어봐요</Eyebrow>
            <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              자주 묻는 질문
            </h2>
          </Reveal>
          <div className="mt-10 space-y-2.5">
            {FAQ.map(([q, a], i) => (
              <Reveal key={q} delay={i * 0.06}>
                <details className="group rounded-xl border border-olive/12 bg-white px-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-semibold marker:hidden">
                    {q}
                    <span className="ml-3 font-handwrite text-2xl text-olive transition-transform duration-200 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="pb-5 text-[15px] leading-relaxed text-ink/65">
                    {a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── 마지막 CTA ── */}
        <section className="mx-auto max-w-2xl px-6 pb-24 pt-10 text-center">
          <Reveal>
            <ChefHat className="mx-auto h-16 w-16 rotate-3 text-ink/80" />
            {/* h2: Pretendard bold (원래 스타일로) */}
            <h2 className="mt-6 text-balance text-4xl font-bold leading-[1.2] sm:text-5xl">
              오늘 수업부터,
              <br />
              녹음만 해보세요.
            </h2>
            <p className="mx-auto mt-4 max-w-xs text-base text-ink/50">
              설치하고 녹음 버튼 하나면 끝이에요.
            </p>
            <a
              href="/app/"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-chili px-9 py-4 text-base font-semibold text-cream shadow-[0_4px_16px_rgba(217,75,43,0.35)] transition-all hover:scale-[1.03] hover:shadow-[0_6px_20px_rgba(217,75,43,0.45)] active:scale-95"
            >
              ChefNote 시작하기 →
            </a>
            <p className="mt-4 text-sm font-medium uppercase tracking-[0.18em] text-ink/40">
              무료로 시작
            </p>
          </Reveal>
        </section>
      </main>

      {/* ── 푸터 ── */}
      <footer className="relative border-t border-olive/10 px-6 py-12 text-center">
        <Logo size="sm" className="opacity-60" />
        <p className="mt-3 text-sm text-ink/40">
          조리과 학생을 위한 AI 수업 노트
        </p>
        <nav className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2">
          <a href="/terms/" className="text-xs text-ink/35 transition-colors hover:text-ink/60">이용약관</a>
          <a href="/privacy/" className="text-xs text-ink/35 transition-colors hover:text-ink/60">개인정보처리방침</a>
          <a href="/refund/" className="text-xs text-ink/35 transition-colors hover:text-ink/60">환불정책</a>
        </nav>
        <p className="mt-5 text-xs text-ink/25">
          문의: junhongbag64@gmail.com
        </p>
        <p className="mt-1 text-xs text-ink/25">© 2026 ChefNote. All rights reserved.</p>
      </footer>
    </div>
  );
}
