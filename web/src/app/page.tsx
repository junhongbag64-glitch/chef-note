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
    title: "시험 전에 꺼내봐요",
    desc: "수업별로 저장되고 검색돼요. 정리 안 된 녹음 파일 더미를 뒤질 필요 없어요.",
  },
];

const FEATURES = [
  ["재료는 용량까지", "버터 30g, 양파 1개처럼 정확하게"],
  ["조리 순서 그대로", "온도·시간·상태 판단 기준까지"],
  ["교수님 팁 캐치", '"이거 시험 나와요" 같은 포인트'],
  ["1.5시간 수업도 OK", "긴 실습 통째로 안정 처리"],
  ["폰 녹음앱도", "갤럭시·아이폰 파일 공유로 바로"],
  ["녹음은 안 날아가요", "1초 단위 저장 — 앱이 죽어도 복구"],
];

const FAQ = [
  ["무료인가요?", "네, 무료로 시작할 수 있어요. 별도 결제 없이 바로 수업 녹음을 노트로 만들 수 있어요."],
  ["1시간 넘는 수업도 되나요?", "네. 1시간 30분이 넘는 실습 수업도 통째로 올려서 정리할 수 있어요. 업로드만 끝나면 앱을 닫아도 백그라운드에서 계속 변환돼요."],
  ["수업 중에 녹음을 못 했어요", "괜찮아요. 폰 녹음 앱으로 녹음한 파일을 업로드하거나, '공유'에서 ChefNote로 바로 보내면 돼요."],
  ["노트가 틀릴 수도 있나요?", "AI가 듣고 정리해서 100%는 아니에요. 모든 노트는 직접 고칠 수 있으니 중요한 재료·수치는 한 번 확인하는 걸 권해요."],
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* 줄노트 종이 배경 (전체) */}
      <div className="paper-lines pointer-events-none fixed inset-0 opacity-50" />

      {/* ── 상단 내비 ── */}
      <header className="sticky top-0 z-50 border-b border-olive/10 bg-cream/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Logo size="sm" />
          <a
            href="https://chefnote.kr"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream transition-transform hover:scale-[1.04] active:scale-95"
          >
            시작하기
          </a>
        </div>
      </header>

      <main className="relative">
        {/* ── 히어로 ── */}
        <section className="mx-auto flex max-w-2xl flex-col items-center px-6 pb-10 pt-16 text-center sm:pt-24">
          <Reveal>
            <Logo size="lg" />
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-8 -rotate-2 font-handwrite text-3xl text-chili">
              조리과 학생을 위한
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <h1 className="mt-2 text-balance text-5xl font-bold leading-[1.12] tracking-tight sm:text-6xl">
              녹음만 하세요.
              <br />
              노트는{" "}
              <span className="relative inline-block">
                완성
                <Squiggle className="absolute -bottom-2 left-0 h-3 w-full text-yolk" />
              </span>
              돼 있어요.
            </h1>
          </Reveal>

          <Reveal delay={0.3}>
            <p className="mx-auto mt-7 max-w-md text-lg leading-relaxed text-ink/70">
              수업을 녹음하면 재료·조리 순서·교수님 팁까지 AI가 자동으로 정리해줘요.
            </p>
          </Reveal>

          <Reveal delay={0.42}>
            <div className="relative mt-9 inline-block">
              <a
                href="https://chefnote.kr"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-base font-semibold text-cream transition-transform hover:scale-[1.03] active:scale-95"
              >
                지금 시작하기 →
              </a>
              <CurlyArrow className="absolute -right-12 -top-7 h-9 w-14 -scale-x-100 text-ink/40" />
            </div>
          </Reveal>

          {/* 살짝 기울어진 노트 카드 */}
          <Reveal delay={0.55} className="mt-16 w-full max-w-sm">
            <div className="relative rotate-2 rounded-2xl border border-olive/15 bg-white p-5 text-left shadow-[0_18px_44px_rgba(26,26,26,0.13)]">
              <span className="absolute -top-2.5 left-9 h-5 w-24 -rotate-6 rounded-sm bg-yolk/70" />
              <div className="text-[11px] font-semibold uppercase tracking-wider text-olive">
                실습 · 양식
              </div>
              <div className="mt-1 text-xl font-bold">비프 부르기뇽</div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-ink/40">
                재료
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink/80">
                소고기 양지 600g · 레드와인 500ml · 양파 1개 · 버터 30g
              </p>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink/40">
                조리 순서
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink/80">
                1. 소고기를 3cm 큐브로 썰어 밑간한다.
                <br />
                2. 센 불에 겉면을 갈색이 나게 시어링한다.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ── 작동 방식 ── */}
        <section className="mx-auto max-w-4xl px-6 py-20">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              이렇게 작동해요
            </h2>
            <p className="mt-3 text-ink/60">녹음 한 번이면 끝. 나머지는 알아서.</p>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.12}>
                <div className="relative h-full rounded-2xl border border-olive/15 bg-white p-6 text-center">
                  <span className="absolute right-5 top-4 font-handwrite text-3xl text-ink/15">
                    {s.n}
                  </span>
                  <s.icon className="mx-auto h-12 w-12 text-ink" />
                  <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/65">
                    {s.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── 결과물 / 기능 ── */}
        <section className="mx-auto max-w-4xl px-6 py-20">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              이런 노트가 나와요
            </h2>
            <p className="mt-3 text-ink/60">
              그냥 받아쓰기가 아니라, <span className="font-semibold text-olive">요리 노트</span>로.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-3 sm:grid-cols-2">
            {FEATURES.map(([title, desc], i) => (
              <Reveal key={title} delay={(i % 2) * 0.08}>
                <div className="flex items-start gap-3 rounded-xl border border-olive/12 bg-white px-5 py-4">
                  <span className="mt-0.5 font-handwrite text-2xl leading-none text-chili">
                    ✓
                  </span>
                  <div>
                    <div className="font-bold">{title}</div>
                    <div className="text-sm text-ink/60">{desc}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mx-auto max-w-2xl px-6 py-20">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              자주 묻는 질문
            </h2>
          </Reveal>
          <div className="mt-10 space-y-3">
            {FAQ.map(([q, a], i) => (
              <Reveal key={q} delay={i * 0.06}>
                <details className="group rounded-xl border border-olive/15 bg-white px-5 open:bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-semibold marker:hidden">
                    {q}
                    <span className="ml-3 font-handwrite text-2xl text-olive transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="pb-5 text-[15px] leading-relaxed text-ink/70">
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
            <ChefHat className="mx-auto h-16 w-16 rotate-3 text-ink" />
            <h2 className="mt-6 text-balance text-4xl font-bold leading-tight tracking-tight">
              오늘 수업부터,
              <br />
              녹음만 해보세요.
            </h2>
            <a
              href="https://chefnote.kr"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-chili px-9 py-4 text-base font-semibold text-cream transition-transform hover:scale-[1.03] active:scale-95"
            >
              ChefNote 시작하기 →
            </a>
            <p className="mt-4 font-handwrite text-xl text-ink/40">무료로 시작</p>
          </Reveal>
        </section>
      </main>

      {/* ── 푸터 ── */}
      <footer className="relative border-t border-olive/10 px-6 py-10 text-center">
        <Logo size="sm" className="opacity-80" />
        <p className="mt-3 text-sm text-ink/45">
          조리과 학생을 위한 AI 수업 노트
        </p>
        <p className="mt-1 text-xs text-ink/35">© 2026 ChefNote</p>
      </footer>
    </div>
  );
}
