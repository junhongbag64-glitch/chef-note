/* ─────────────────────────────────────────────
   ChefNote 손그림 doodle 세트 — Wimpy Kid 감성(단색 잉크 스케치).
   전부 stroke="currentColor" → 부모 text 색으로 제어 (기본 ink).
   DESIGN.md 참조: 그림은 흑백, 살짝 wobbly.
   ───────────────────────────────────────────── */

type DoodleProps = { className?: string };

/** 대충 그린 조리모 (toque) */
export function ChefHat({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 64 60"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* 부풀어 오른 모자 윗부분 */}
      <path d="M15 36c-6 .4-9.5-6.6-3.6-10.6-2.6-7 5.4-12.4 11.6-8.4 2.6-7.4 14.4-7.4 17.4.6 7-3.4 13.6 2.6 8.4 9.8 4.6 2.8 1.8 9.4-3.8 8.6" />
      {/* 모자 띠 */}
      <path d="M16.5 35.5c-.3 4 .2 8 1 10.4 9.4 3 21 3 29.8.2 1-2.4 1.4-6.6 1.2-10.8" />
      {/* 띠 스티치 */}
      <path d="M24 40v5.5M32.5 41v5.5M41 40v5.6" />
    </svg>
  );
}

/** 로고: 조리모 + 날리는 손글씨 chefnote */
export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const hat = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const text =
    size === "lg" ? "text-5xl" : size === "sm" ? "text-2xl" : "text-3xl";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-ink ${className ?? ""}`}
    >
      <ChefHat className={`${hat} -rotate-6`} />
      <span className={`font-handwrite ${text} font-bold leading-none -rotate-2`}>
        chefnote
      </span>
    </span>
  );
}

/** 마이크 (녹음) */
export function MicDoodle({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="17" y="6" width="14" height="22" rx="7" transform="rotate(-2 24 17)" />
      <path d="M12 22c0 7 5.4 12 12 12s12-5 12-12" />
      <path d="M24 34v7M17 41h14" />
      <path d="M20 13h8M20 18h8" />
    </svg>
  );
}

/** 반짝임 (AI 자동 정리) */
export function SparkleDoodle({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M24 7c1 7 4 10 11 11-7 1-10 4-11 11-1-7-4-10-11-11 7-1 10-4 11-11Z" />
      <path d="M38 28c.5 3 1.6 4.2 4.5 4.7-2.9.6-4 1.7-4.5 4.6-.5-2.9-1.6-4-4.5-4.6 2.9-.5 4-1.7 4.5-4.7Z" />
      <path d="M11 30c.4 2.4 1.3 3.4 3.6 3.8-2.3.5-3.2 1.4-3.6 3.8-.4-2.4-1.3-3.3-3.6-3.8 2.3-.4 3.2-1.4 3.6-3.8Z" />
    </svg>
  );
}

/** 줄노트 (완성된 노트) */
export function NotebookDoodle({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 7.5c-1 11-1 22 0 33 8 1.6 16 1.6 24 0 1-11 1-22 0-33-8-1.4-16-1.4-24 0Z" />
      <path d="M18 7v34" />
      <path d="M23 16h12M23 23h12M23 30h8" />
    </svg>
  );
}

/** 손그림 곡선 화살표 */
export function CurlyArrow({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 60 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6 8c14-3 30 2 40 14" />
      <path d="M38 23c3 .2 6-.2 8-1M46 14c.6 3 .6 6 0 8" />
    </svg>
  );
}

/** 강조용 손그림 밑줄 */
export function Squiggle({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 200 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <path d="M4 9c30-6 60-7 95-3 33 3 66 1 97-3" />
    </svg>
  );
}
