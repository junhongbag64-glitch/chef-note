/**
 * ChefNote Cloudflare Worker
 *
 * Handles server-side audio processing so the user can leave the app
 * while transcription + note generation runs in the cloud.
 *
 * Flow:
 *   1. Client uploads audio blob → AssemblyAI (directly, using key from /get-asm-key)
 *   2. Client creates transcript with webhook_url pointing here
 *   3. Client calls POST /register-job  {jobId, asmId, uid, idToken, metadata}
 *   4. AssemblyAI finishes → POST /asm-webhook/:jobId
 *   5. Worker calls Claude → stores completed note in KV
 *   6. Client opens app → GET /job-status/:jobId → gets note → saves to Firestore
 *
 * Environment bindings (set in Cloudflare dashboard or wrangler.toml):
 *   JOBS           — KV namespace for job state
 *   ASM_KEY        — AssemblyAI API key  (secret)
 *   ANTHROPIC_KEY  — Anthropic API key   (secret)
 */

const ASM_API = 'https://api.assemblyai.com';
const ANTHROPIC_API = 'https://api.anthropic.com';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, anthropic-version, anthropic-beta, x-api-key',
};

function ok(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function err(msg, status = 500) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/* ═══════════════════════════════════════════
   ROUTER
═══════════════════════════════════════════ */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // ── Existing endpoints (backward compat) ──
    if (url.pathname === '/get-asm-key' && request.method === 'GET') {
      return ok({ key: env.ASM_KEY });
    }

    // ── New: job lifecycle ──
    if (url.pathname === '/register-job' && request.method === 'POST') {
      return handleRegisterJob(request, env);
    }

    if (url.pathname.startsWith('/asm-webhook/') && request.method === 'POST') {
      const jobId = url.pathname.slice('/asm-webhook/'.length);
      ctx.waitUntil(handleAsmWebhook(jobId, request, env));
      return new Response('OK', { headers: CORS });
    }

    if (url.pathname.startsWith('/job-status/') && request.method === 'GET') {
      const jobId = url.pathname.slice('/job-status/'.length);
      return handleJobStatus(jobId, env);
    }

    // ── Anthropic proxy (existing) ──
    if (url.pathname.startsWith('/anthropic/')) {
      return handleAnthropicProxy(request, env, url);
    }

    return new Response('Not found', { status: 404, headers: CORS });
  },
};

/* ═══════════════════════════════════════════
   JOB REGISTRATION
═══════════════════════════════════════════ */
async function handleRegisterJob(request, env) {
  let body;
  try { body = await request.json(); } catch { return err('Invalid JSON', 400); }

  const { jobId, asmId, uid, idToken, metadata } = body;
  if (!jobId || !asmId || !uid) return err('jobId, asmId, uid required', 400);

  await putJob(env, jobId, {
    uid,
    idToken: idToken || null,
    asmId,
    metadata: metadata || {},
    status: 'transcribing',
    createdAt: Date.now(),
  });

  return ok({ ok: true, jobId });
}

/* ═══════════════════════════════════════════
   ASM WEBHOOK HANDLER
═══════════════════════════════════════════ */
async function handleAsmWebhook(jobId, request, env) {
  let body;
  try { body = await request.json(); } catch { return; }

  const job = await getJob(env, jobId);
  if (!job || !job.uid) return;

  if (body.status === 'error') {
    await putJob(env, jobId, { ...job, status: 'error', error: body.error || '음성 인식 실패' });
    return;
  }
  if (body.status !== 'completed') return;

  // AssemblyAI includes full transcript in webhook body
  let text = body.text || '';

  // Safety: re-fetch if text is missing
  if (!text && (body.transcript_id || body.id)) {
    const asmId = body.transcript_id || body.id;
    try {
      const r = await fetch(`${ASM_API}/v2/transcript/${asmId}`, {
        headers: { authorization: env.ASM_KEY },
      });
      const d = await r.json();
      text = d.text || '';
    } catch { /* ignore */ }
  }

  if (!text || text.trim().length < 5) {
    await putJob(env, jobId, { ...job, status: 'error', error: '음성 인식 결과가 비어있습니다' });
    return;
  }

  // Mark as generating so client can show correct status
  await putJob(env, jobId, { ...job, status: 'generating', transcript: text });

  try {
    const note = await generateNote(text, job.metadata || {}, env);
    await putJob(env, jobId, {
      ...job,
      status: 'done',
      note,
      completedAt: Date.now(),
      // keep transcript for debugging (stripped client-side)
    });
  } catch (e) {
    await putJob(env, jobId, { ...job, status: 'error', error: `노트 생성 실패: ${e.message}` });
  }
}

/* ═══════════════════════════════════════════
   JOB STATUS ENDPOINT
═══════════════════════════════════════════ */
async function handleJobStatus(jobId, env) {
  if (!jobId) return err('jobId required', 400);
  const job = await getJob(env, jobId);
  if (!job) return ok({ status: 'not_found' }, 404);

  // Strip sensitive data before returning
  const { idToken: _tok, transcript: _tr, ...safe } = job;
  return ok(safe);
}

/* ═══════════════════════════════════════════
   NOTE GENERATION (Claude)
═══════════════════════════════════════════ */
async function generateNote(transcript, metadata, env) {
  const { duration = 0, memos = [] } = metadata;

  const memoSection = memos.length
    ? `\n수업 중 추가 메모 (중요 참고사항):\n${memos.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n`
    : '';

  const prompt = `다음은 조리학과 수업 녹음을 텍스트로 변환한 내용입니다.
${memoSection}
텍스트:
"""
${transcript}
"""

이 수업 내용을 분석해 아래 JSON 형식 **만** 반환하세요. 다른 텍스트나 마크다운 코드 블록 없이 순수 JSON만 반환하세요.${memos.length ? ' 메모에 언급된 내용을 반드시 반영하세요.' : ''}

한 수업에서 여러 요리/레시피를 다루는 경우, recipes 배열에 각각 분리해서 넣어주세요. (예: 토마토 소스와 알르망제 소스를 함께 배웠다면 recipes에 2개)

{
  "title": "수업 제목 (날짜나 전체 수업명, 간결하게)",
  "recipes": [
    {
      "title": "요리/레시피명 (없으면 수업 제목과 동일하게)",
      "type": "recipe" 또는 "theory",
      "classType": "실습" 또는 "이론",
      "content": "핵심 내용/조리 순서 (단계별, 줄바꿈 \\n 사용, 각 줄이 한 단계)",
      "ingredients": ["재료명 (용량/수량)"],
      "tips": ["교수님이 강조한 팁이나 주의사항"]
    }
  ]
}

판단 기준:
- 실제 조리/요리/실습 관련이면 "recipe"
- 이론·역사·영양학·위생·서비스 등이면 "theory"
- 여러 요리가 명확히 구분된다면 반드시 여러 recipes로 분리할 것`;

  const res = await fetch(`${ANTHROPIC_API}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const e = await res.text().catch(() => '');
    throw new Error(`Claude ${res.status}: ${e.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data.content?.[0]?.text || '';
  if (!raw) throw new Error('Claude 응답이 비어있습니다');

  // Parse JSON from response
  const m = raw.match(/\{[\s\S]*\}/);
  const clean = m ? m[0] : raw.replace(/```[\w]*\n?/g, '').trim();
  const parsed = JSON.parse(clean);

  // Normalize recipes array
  if (!parsed.recipes || !Array.isArray(parsed.recipes)) {
    parsed.recipes = [{
      id: 'r0',
      title: parsed.title || '레시피',
      type: parsed.type || 'recipe',
      classType: parsed.classType || '실습',
      ingredients: parsed.ingredients || [],
      content: parsed.content || '',
      tips: parsed.tips || [],
      paragraphAttachments: {},
    }];
  } else {
    parsed.recipes = parsed.recipes.map((r, i) => ({
      id: 'r' + i,
      paragraphAttachments: {},
      ...r,
    }));
  }

  const now = Date.now();
  return {
    id: now.toString(),
    date: new Date(now).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
    timestamp: now,
    duration,
    favorite: false,
    memos,
    media: [],
    audioBlob: null,
    ...parsed,
  };
}

/* ═══════════════════════════════════════════
   ANTHROPIC PROXY (existing endpoint)
═══════════════════════════════════════════ */
async function handleAnthropicProxy(request, env, url) {
  const targetPath = url.pathname.replace('/anthropic', '');
  const targetUrl = `${ANTHROPIC_API}${targetPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set('x-api-key', env.ANTHROPIC_KEY);
  headers.delete('host');

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.body,
  });

  const respHeaders = new Headers(response.headers);
  Object.entries(CORS).forEach(([k, v]) => respHeaders.set(k, v));

  return new Response(response.body, {
    status: response.status,
    headers: respHeaders,
  });
}

/* ═══════════════════════════════════════════
   KV HELPERS
═══════════════════════════════════════════ */
async function getJob(env, jobId) {
  try {
    const raw = await env.JOBS.get(jobId);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function putJob(env, jobId, data) {
  await env.JOBS.put(jobId, JSON.stringify(data), { expirationTtl: 604800 }); // 7 days
}
