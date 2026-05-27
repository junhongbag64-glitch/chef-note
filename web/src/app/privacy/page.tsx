import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 — ChefNote",
  description: "ChefNote 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-olive/10 bg-cream/80 px-6 py-4">
        <Link href="/" className="text-sm font-semibold text-olive hover:underline">
          ← ChefNote
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-ink/45">시행일: 2026년 1월 1일</p>

        <p className="mt-6 text-[15px] leading-relaxed text-ink/70">
          ChefNote(이하 &ldquo;서비스&rdquo;)는 개인정보보호법을 준수하며, 회원의 개인정보를
          안전하게 보호합니다.
        </p>

        <section className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink/75">
          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">1. 수집하는 개인정보 항목</h2>
            <div className="overflow-x-auto rounded-xl border border-olive/12">
              <table className="min-w-full text-sm">
                <thead className="bg-olive/8">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-ink">항목</th>
                    <th className="px-4 py-3 text-left font-semibold text-ink">수집 방법</th>
                    <th className="px-4 py-3 text-left font-semibold text-ink">목적</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-olive/8 bg-white">
                  <tr>
                    <td className="px-4 py-3">이메일 주소, 이름, 프로필 사진</td>
                    <td className="px-4 py-3">Google OAuth 로그인</td>
                    <td className="px-4 py-3">회원 식별, 서비스 제공</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">음성 녹음 파일</td>
                    <td className="px-4 py-3">회원 직접 업로드</td>
                    <td className="px-4 py-3">노트 생성(STT 변환 후 삭제)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">생성된 노트 데이터</td>
                    <td className="px-4 py-3">서비스 내 자동 생성</td>
                    <td className="px-4 py-3">수업 노트 저장·제공</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">서비스 이용 기록</td>
                    <td className="px-4 py-3">자동 수집</td>
                    <td className="px-4 py-3">서비스 개선, 오류 분석</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">2. 개인정보 보유 및 이용 기간</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>회원 탈퇴 시 즉시 삭제 (단, 관계 법령에 따라 보존이 필요한 경우 예외)</li>
              <li>음성 파일: 노트 생성 완료 후 즉시 삭제</li>
              <li>노트 데이터: 회원 탈퇴 시 삭제</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">3. 개인정보 제3자 제공 및 위탁</h2>
            <p className="mb-3">서비스 운영을 위해 아래 업체에 개인정보 처리를 위탁합니다.</p>
            <div className="overflow-x-auto rounded-xl border border-olive/12">
              <table className="min-w-full text-sm">
                <thead className="bg-olive/8">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-ink">수탁사</th>
                    <th className="px-4 py-3 text-left font-semibold text-ink">위탁 업무</th>
                    <th className="px-4 py-3 text-left font-semibold text-ink">보유 기간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-olive/8 bg-white">
                  <tr>
                    <td className="px-4 py-3">Google Firebase</td>
                    <td className="px-4 py-3">인증·데이터 저장·파일 저장</td>
                    <td className="px-4 py-3">서비스 이용 기간</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">AssemblyAI</td>
                    <td className="px-4 py-3">음성→텍스트 변환(STT)</td>
                    <td className="px-4 py-3">변환 완료 후 즉시 삭제</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Anthropic / Google</td>
                    <td className="px-4 py-3">AI 노트 생성(LLM)</td>
                    <td className="px-4 py-3">요청 완료 후 즉시 삭제</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Cloudflare</td>
                    <td className="px-4 py-3">서버 인프라·보안</td>
                    <td className="px-4 py-3">서비스 이용 기간</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">4. 정보 주체의 권리</h2>
            <p>회원은 언제든지 다음 권리를 행사할 수 있습니다.</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>개인정보 조회 및 수정</li>
              <li>개인정보 삭제(회원 탈퇴)</li>
              <li>개인정보 처리 정지 요청</li>
            </ul>
            <p className="mt-3">
              권리 행사는 이메일(junhongbag64@gmail.com)로 요청하시면 7일 내 처리해 드립니다.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">5. 개인정보 보호 조치</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>모든 통신은 HTTPS(TLS)로 암호화됩니다.</li>
              <li>Firebase 보안 규칙으로 본인 데이터 외 접근을 차단합니다.</li>
              <li>API 키 등 민감 자격증명은 서버(Cloudflare Worker)에서만 관리합니다.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">6. 개인정보 보호 책임자</h2>
            <div className="rounded-xl border border-olive/15 bg-white p-5">
              <p>이름: 박준홍</p>
              <p className="mt-1">
                이메일:{" "}
                <a href="mailto:junhongbag64@gmail.com" className="text-olive hover:underline">
                  junhongbag64@gmail.com
                </a>
              </p>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">7. 개인정보 침해 신고</h2>
            <p>개인정보 침해에 관한 신고는 아래 기관에 문의하실 수 있습니다.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>개인정보보호위원회 (privacy.go.kr / 국번 없이 182)</li>
              <li>한국인터넷진흥원 개인정보침해신고센터 (privacy.kisa.or.kr / 국번 없이 118)</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
