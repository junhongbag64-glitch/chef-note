import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "환불정책 — ChefNote",
  description: "ChefNote 환불 및 결제 정책",
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-olive/10 bg-cream/80 px-6 py-4">
        <Link href="/" className="text-sm font-semibold text-olive hover:underline">
          ← ChefNote
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold">환불정책</h1>
        <p className="mt-2 text-sm text-ink/45">시행일: 2026년 1월 1일</p>

        <section className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink/75">
          <div className="rounded-xl border border-olive/15 bg-white p-6">
            <p className="text-lg font-bold text-ink">현재 ChefNote는 완전 무료입니다.</p>
            <p className="mt-2 text-ink/65">
              별도의 구독료나 결제 없이 모든 기능을 사용할 수 있습니다.
              결제가 없으므로 환불 사유도 발생하지 않습니다.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">유료 전환 시 정책 예고</h2>
            <p>
              향후 유료 요금제를 도입할 경우, 최소 30일 전에 서비스 내 공지와 이메일로
              요금제 내용 및 환불 정책을 안내할 예정입니다.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>구독 취소는 언제든 가능하며, 취소 즉시 다음 결제가 중단됩니다.</li>
              <li>이미 결제된 기간은 서비스 이용이 가능합니다.</li>
              <li>
                전자상거래 등에서의 소비자 보호에 관한 법률에 따라,
                디지털 콘텐츠 사용 전에는 7일 이내 청약 철회가 가능합니다.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">문의</h2>
            <div className="rounded-xl border border-olive/15 bg-white p-5">
              <p>결제·환불 관련 문의는 아래로 연락주세요.</p>
              <p className="mt-2">
                이메일:{" "}
                <a href="mailto:junhongbag64@gmail.com" className="text-olive hover:underline">
                  junhongbag64@gmail.com
                </a>
              </p>
              <p className="mt-1 text-sm text-ink/50">
                문의 후 영업일 기준 3일 이내 답변드립니다.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
