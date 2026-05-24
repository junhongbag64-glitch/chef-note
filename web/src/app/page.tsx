"use client";

import { motion } from "framer-motion";

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* 줄노트 종이 배경 */}
      <div className="paper-lines pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
        {/* 브랜드 워드마크 */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: easeOut }}
          className="mb-7 flex items-center gap-2"
        >
          <span className="text-2xl font-bold tracking-tight">
            Chef<span className="italic text-olive">Note</span>
          </span>
          <span className="rounded-full bg-olive/10 px-2 py-0.5 text-[11px] font-semibold text-olive">
            BETA
          </span>
        </motion.div>

        {/* 손글씨 악센트 */}
        <motion.p
          initial={{ opacity: 0, rotate: -3 }}
          animate={{ opacity: 1, rotate: -3 }}
          transition={{ duration: 0.55, ease: easeOut, delay: 0.12 }}
          className="mb-2 font-handwrite text-3xl text-chili"
        >
          조리과 학생을 위한
        </motion.p>

        {/* 헤드라인 */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: easeOut, delay: 0.18 }}
          className="text-balance text-5xl font-bold leading-[1.12] tracking-tight sm:text-6xl"
        >
          녹음만 하세요.
          <br />
          노트는 <span className="text-olive">완성</span>돼 있어요.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: easeOut, delay: 0.3 }}
          className="mt-6 max-w-md text-lg leading-relaxed text-ink/70"
        >
          수업을 녹음하면 재료·조리 순서·교수님 팁까지 AI가 자동으로 정리해줘요.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: easeOut, delay: 0.42 }}
          className="mt-9"
        >
          <a
            href="https://chefnote.kr"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-base font-semibold text-cream transition-transform hover:scale-[1.03] active:scale-95"
          >
            지금 시작하기 →
          </a>
        </motion.div>

        {/* 살짝 기울어진 노트 카드 (결과물 미리보기) */}
        <motion.div
          initial={{ opacity: 0, y: 36, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: 2 }}
          transition={{ duration: 0.75, ease: easeOut, delay: 0.55 }}
          className="relative mt-16 w-full max-w-sm rounded-2xl border border-olive/15 bg-white p-5 text-left shadow-[0_18px_44px_rgba(26,26,26,0.13)]"
        >
          {/* 마스킹 테이프 */}
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
        </motion.div>
      </div>
    </main>
  );
}
