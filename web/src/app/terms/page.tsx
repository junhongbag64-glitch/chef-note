import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관 — ChefNote",
  description: "ChefNote 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-olive/10 bg-cream/80 px-6 py-4">
        <Link href="/" className="text-sm font-semibold text-olive hover:underline">
          ← ChefNote
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold">이용약관</h1>
        <p className="mt-2 text-sm text-ink/45">시행일: 2026년 1월 1일</p>

        <section className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink/75">
          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">제1조 (목적)</h2>
            <p>
              이 약관은 ChefNote(이하 &ldquo;서비스&rdquo;)를 제공하는 운영자(이하 &ldquo;운영자&rdquo;)와
              서비스를 이용하는 회원(이하 &ldquo;회원&rdquo;) 사이의 권리·의무 및 기타 필요한 사항을
              규정하는 것을 목적으로 합니다.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">제2조 (서비스 개요)</h2>
            <p>
              ChefNote는 조리학과 학생이 수업 중 녹음한 음성 파일을 AI 기술로 자동 분석하여
              재료·조리 순서·교수님 팁 등이 포함된 수업 노트를 생성하는 서비스입니다.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">제3조 (이용 자격)</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>만 14세 이상인 분만 서비스를 이용할 수 있습니다.</li>
              <li>본 약관에 동의하고 Google 계정으로 가입한 경우 회원 자격이 부여됩니다.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">제4조 (서비스 이용)</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>회원은 수업 목적의 녹음 파일을 업로드하여 노트를 생성할 수 있습니다.</li>
              <li>무료 요금제는 하루 최대 30건의 노트 생성이 가능합니다.</li>
              <li>음성 파일은 노트 생성 목적에만 사용되며, 처리 완료 후 삭제됩니다.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">제5조 (금지 행위)</h2>
            <p>회원은 다음 행위를 해서는 안 됩니다.</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>타인의 동의 없이 녹음한 음성 파일을 업로드하는 행위</li>
              <li>서비스를 상업적 목적으로 무단 이용하는 행위</li>
              <li>서비스의 정상적인 운영을 방해하는 행위</li>
              <li>허위 정보를 입력하거나 타인의 계정을 도용하는 행위</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">제6조 (지식재산권)</h2>
            <p>
              서비스 내 UI, 로고, 소프트웨어 등의 지식재산권은 운영자에게 귀속됩니다.
              회원이 서비스를 통해 생성한 노트 콘텐츠의 소유권은 회원 본인에게 있습니다.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">제7조 (책임 제한)</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>AI가 생성한 노트의 정확성을 100% 보장하지 않습니다. 중요한 재료·수치는 직접 확인하세요.</li>
              <li>천재지변, 서비스 장애 등 불가항력적 사유로 인한 손해에 대해 책임지지 않습니다.</li>
              <li>회원의 귀책 사유로 발생한 손해는 운영자가 책임지지 않습니다.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">제8조 (서비스 변경 및 종료)</h2>
            <p>
              운영자는 서비스의 내용을 변경하거나 종료할 수 있습니다. 중요한 변경이 있을 경우
              최소 7일 전에 서비스 내 공지 또는 이메일로 안내합니다.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">제9조 (준거법 및 분쟁 해결)</h2>
            <p>
              본 약관은 대한민국 법률에 따라 해석되며, 분쟁 발생 시 운영자의 소재지를 관할하는
              법원을 1심 법원으로 합니다.
            </p>
          </div>

          <div className="rounded-xl border border-olive/15 bg-white p-5">
            <p className="font-semibold text-ink">문의</p>
            <p className="mt-1">
              이메일:{" "}
              <a href="mailto:junhongbag64@gmail.com" className="text-olive hover:underline">
                junhongbag64@gmail.com
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
