/**
 * ChefNote Cloudflare Worker — 보안 강화 버전 (2026-05)
 *
 * 변경 요약:
 *   - /get-asm-key 제거 (AssemblyAI 키가 더 이상 브라우저에 노출되지 않음)
 *   - /asm-upload, /asm-transcript, /asm-transcript-status/:id 신규 (Worker가 ASM 프록시)
 *   - 모든 보호 엔드포인트에 Firebase idToken 검증 + email_verified 강제
 *   - uid 별 일일 노트 생성 한도 (KV 카운터)
 *   - 오디오 100MB / transcript 60,000자 상한
 *   - CORS Origin 화이트리스트
 *   - /retry-llm/:jobId — 저장된 transcript 로 LLM 만 재실행 (STT 재호출 안 함)
 *
 * Environment bindings:
 *   JOBS              — KV namespace (jobs + quota counters + JWK cache)
 *   ASSEMBLYAI_KEY    — AssemblyAI API key (secret)
 *   CLAUDE_KEY        — Anthropic API key (secret)
 *   GEMINI_KEY        — Google AI Studio key (secret)
 *
 * Configuration constants (env-overridable):
 *   FIREBASE_PROJECT_ID    (default 'chefnote-1833f')
 *   FREE_NOTES_PER_DAY     (default 5)
 *   OWNER_EMAILS           comma-separated, bypass quota
 *   ALLOWED_ORIGINS        comma-separated origins (default: GitHub Pages)
 */

const ASM_API = 'https://api.assemblyai.com';
const ANTHROPIC_API = 'https://gateway.ai.cloudflare.com/v1/d872f29764b5c5b238824decd2dc6d91/chefnote/anthropic';

const DEFAULT_FIREBASE_PROJECT_ID = 'chefnote-1833f';
const DEFAULT_FREE_NOTES_PER_DAY = 5;
const DEFAULT_ALLOWED_ORIGINS = [
  'https://junhongbag64-glitch.github.io',
  'http://localhost:8080',
  'http://localhost:3000',
];

const MAX_AUDIO_BYTES = 100 * 1024 * 1024;    // 100MB
const MAX_TRANSCRIPT_CHARS = 60000;            // LLM 입력 상한 (요금 폭탄 방지)

/* ═══════════════════════════════════════════
   CORS — Origin 화이트리스트
═══════════════════════════════════════════ */
function getAllowedOrigins(env) {
  if (env.ALLOWED_ORIGINS) {
    return env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = getAllowedOrigins(env);
  const allowedOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, anthropic-version, anthropic-beta, x-id-token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function ok(data, status = 200, request = null, env = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (request && env) Object.assign(headers, corsHeaders(request, env));
  return new Response(JSON.stringify(data), { status, headers });
}

function err(msg, status = 500, request = null, env = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (request && env) Object.assign(headers, corsHeaders(request, env));
  return new Response(JSON.stringify({ error: msg }), { status, headers });
}

/* ═══════════════════════════════════════════
   FIREBASE ID TOKEN 검증 (RS256 / JWK)
═══════════════════════════════════════════ */
let _jwkCache = { fetchedAt: 0, keys: {} };

async function getGoogleJWKs() {
  const now = Date.now();
  // Google 의 JWK 응답은 보통 ~6시간 캐시 권장 — 1시간 마다 refresh
  if (now - _jwkCache.fetchedAt < 60 * 60 * 1000 && Object.keys(_jwkCache.keys).length) {
    return _jwkCache.keys;
  }
  const r = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  if (!r.ok) throw new Error('JWK fetch failed: ' + r.status);
  const data = await r.json();
  const keys = {};
  for (const k of data.keys || []) keys[k.kid] = k;
  _jwkCache = { fetchedAt: now, keys };
  return keys;
}

function base64UrlToBytes(s) {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = norm + '='.repeat((4 - norm.length % 4) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function base64UrlToJson(s) {
  const bytes = base64UrlToBytes(s);
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function verifyFirebaseIdToken(token, env) {
  if (!token || typeof token !== 'string') throw new Error('TOKEN_MISSING');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('TOKEN_MALFORMED');

  const [headerB64, payloadB64, sigB64] = parts;
  let header, payload;
  try {
    header = base64UrlToJson(headerB64);
    payload = base64UrlToJson(payloadB64);
  } catch { throw new Error('TOKEN_DECODE_FAIL'); }

  const projectId = env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;

  // Claim 검증
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= now) throw new Error('TOKEN_EXPIRED');
  if (typeof payload.iat !== 'number' || payload.iat > now + 300) throw new Error('TOKEN_IAT_FUTURE');
  if (payload.aud !== projectId) throw new Error('TOKEN_AUD_MISMATCH');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('TOKEN_ISS_MISMATCH');
  if (!payload.sub || typeof payload.sub !== 'string') throw new Error('TOKEN_NO_SUBJECT');
  if (payload.auth_time && payload.auth_time > now + 300) throw new Error('TOKEN_AUTH_TIME_FUTURE');

  // Signature 검증
  if (header.alg !== 'RS256') throw new Error('TOKEN_WRONG_ALG');
  const jwks = await getGoogleJWKs();
  const jwk = jwks[header.kid];
  if (!jwk) throw new Error('TOKEN_KID_UNKNOWN');

  const cryptoKey = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['verify']
  );
  const sigBytes = base64UrlToBytes(sigB64);
  const dataBytes = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sigBytes, dataBytes);
  if (!valid) throw new Error('TOKEN_SIG_INVALID');

  return payload; // { sub, email, email_verified, ... }
}

/* idToken 을 헤더 또는 body 에서 추출 → 검증 → user 정보 반환.
   - email_verified === true 필수
   - 검증 실패 시 throw */
async function requireUser(request, env, bodyFallback = null) {
  let token = request.headers.get('x-id-token') || '';
  if (!token) {
    const auth = request.headers.get('Authorization') || '';
    if (auth.startsWith('Bearer ')) token = auth.slice(7);
  }
  if (!token && bodyFallback && typeof bodyFallback === 'object' && bodyFallback.idToken) {
    token = bodyFallback.idToken;
  }
  if (!token) throw new Error('AUTH_REQUIRED');

  const payload = await verifyFirebaseIdToken(token, env);
  if (!payload.email_verified) throw new Error('EMAIL_NOT_VERIFIED');
  return {
    uid: payload.sub,
    email: payload.email || '',
    emailVerified: !!payload.email_verified,
    name: payload.name || '',
  };
}

/* ═══════════════════════════════════════════
   사용자 일일 한도 (KV 카운터)
═══════════════════════════════════════════ */
function todayKey() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isOwner(email, env) {
  if (!email || !env.OWNER_EMAILS) return false;
  const list = env.OWNER_EMAILS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

function freeNotesPerDay(env) {
  const n = parseInt(env.FREE_NOTES_PER_DAY || '');
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_FREE_NOTES_PER_DAY;
}

async function getDailyNoteCount(env, uid) {
  try {
    const v = await env.JOBS.get(`quota:notes:${uid}:${todayKey()}`);
    const n = parseInt(v || '0');
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

async function bumpDailyNoteCount(env, uid) {
  const key = `quota:notes:${uid}:${todayKey()}`;
  try {
    const v = await env.JOBS.get(key);
    const n = (parseInt(v || '0') || 0) + 1;
    await env.JOBS.put(key, String(n), { expirationTtl: 60 * 60 * 36 }); // 36h
    return n;
  } catch { return 0; }
}

/* 노트 생성 한도 검사. 한도 초과 시 throw */
async function checkAndChargeQuota(env, user) {
  if (isOwner(user.email, env)) return; // Owner bypass
  const cur = await getDailyNoteCount(env, user.uid);
  const max = freeNotesPerDay(env);
  if (cur >= max) {
    const e = new Error(`QUOTA_EXCEEDED: 일일 노트 생성 한도(${max}개)를 초과했습니다`);
    e.status = 429;
    throw e;
  }
  await bumpDailyNoteCount(env, user.uid);
}

/* ═══════════════════════════════════════════
   ROUTER
═══════════════════════════════════════════ */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    try {
      // ── AssemblyAI webhook (인증 없음 — jobId 가 capability 토큰) ──
      if (url.pathname.startsWith('/asm-webhook/') && request.method === 'POST') {
        const jobId = url.pathname.slice('/asm-webhook/'.length);
        ctx.waitUntil(handleAsmWebhook(jobId, request, env));
        return new Response('OK', { headers: corsHeaders(request, env) });
      }

      // ── AssemblyAI 프록시 (인증 + 한도 필요) ──
      if (url.pathname === '/asm-upload' && request.method === 'POST') {
        return handleAsmUpload(request, env);
      }
      if (url.pathname === '/asm-transcript' && request.method === 'POST') {
        return handleAsmTranscript(request, env);
      }
      if (url.pathname.startsWith('/asm-transcript-status/') && request.method === 'GET') {
        const id = url.pathname.slice('/asm-transcript-status/'.length);
        return handleAsmTranscriptStatus(id, request, env);
      }

      // ── Job lifecycle ──
      if (url.pathname === '/register-job' && request.method === 'POST') {
        return handleRegisterJob(request, env);
      }
      if (url.pathname.startsWith('/job-status/') && request.method === 'GET') {
        const jobId = url.pathname.slice('/job-status/'.length);
        return handleJobStatus(jobId, request, env, ctx);
      }
      if (url.pathname.startsWith('/retry-llm/') && request.method === 'POST') {
        const jobId = url.pathname.slice('/retry-llm/'.length);
        return handleRetryLlm(jobId, request, env, ctx);
      }

      // ── 클라이언트가 transcript 만 보내고 노트 생성 (단일 경로) ──
      if (url.pathname === '/generate-note' && request.method === 'POST') {
        return handleGenerateNote(request, env);
      }

      // ── LLM 프록시 (인증 필요) ──
      if (url.pathname.startsWith('/anthropic/')) {
        return handleAnthropicProxy(request, env, url);
      }
      if (url.pathname === '/gemini/generate' && request.method === 'POST') {
        return handleGeminiProxy(request, env);
      }

      return err('Not found', 404, request, env);
    } catch (e) {
      const status = e.status || 500;
      const msg = e.message || 'Internal error';
      return err(msg, status, request, env);
    }
  },
};

/* ═══════════════════════════════════════════
   ASSEMBLYAI 프록시
   - upload: 클라가 보낸 raw 오디오를 ASM 으로 forward
   - transcript: webhook 자동 첨부, 키는 서버측만
   - status: poll (클라이언트 풀 폴백용)
═══════════════════════════════════════════ */
async function handleAsmUpload(request, env) {
  let user;
  try { user = await requireUser(request, env); }
  catch (e) { return err(e.message, 401, request, env); }

  // 한도 사전 체크 (실제 차감은 transcript 등록 시점)
  if (!isOwner(user.email, env)) {
    const cur = await getDailyNoteCount(env, user.uid);
    if (cur >= freeNotesPerDay(env)) {
      return err(`일일 노트 생성 한도(${freeNotesPerDay(env)}개) 초과 — 내일 다시 시도해주세요`, 429, request, env);
    }
  }

  // 크기 상한
  const lenHdr = parseInt(request.headers.get('Content-Length') || '0');
  if (lenHdr && lenHdr > MAX_AUDIO_BYTES) {
    return err(`오디오 파일이 너무 큽니다 (최대 ${Math.round(MAX_AUDIO_BYTES/1024/1024)}MB)`, 413, request, env);
  }

  // ASM 으로 forward — content-type 은 항상 octet-stream 으로 정규화
  const r = await fetch(`${ASM_API}/v2/upload`, {
    method: 'POST',
    headers: {
      'authorization': env.ASSEMBLYAI_KEY,
      'content-type': 'application/octet-stream',
    },
    body: request.body,
    // @ts-ignore — Cloudflare Workers 가 streaming POST 필요로 함
    duplex: 'half',
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    return err(`AssemblyAI 업로드 실패: ${r.status} ${t.slice(0, 150)}`, r.status, request, env);
  }
  const data = await r.json();
  return ok({ upload_url: data.upload_url }, 200, request, env);
}

async function handleAsmTranscript(request, env) {
  let body;
  try { body = await request.json(); } catch { return err('Invalid JSON', 400, request, env); }

  let user;
  try { user = await requireUser(request, env, body); }
  catch (e) { return err(e.message, 401, request, env); }

  const { upload_url, webhook_url } = body || {};
  if (!upload_url) return err('upload_url required', 400, request, env);

  const payload = {
    audio_url: upload_url,
    language_code: 'ko',
    speech_models: ['universal-2'],
  };
  if (webhook_url) payload.webhook_url = webhook_url;

  const r = await fetch(`${ASM_API}/v2/transcript`, {
    method: 'POST',
    headers: {
      'authorization': env.ASSEMBLYAI_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    return err(`AssemblyAI transcript 등록 실패: ${r.status} ${t.slice(0, 150)}`, r.status, request, env);
  }
  const data = await r.json();
  return ok({ id: data.id }, 200, request, env);
}

async function handleAsmTranscriptStatus(id, request, env) {
  if (!id) return err('id required', 400, request, env);
  let user;
  try { user = await requireUser(request, env); }
  catch (e) { return err(e.message, 401, request, env); }

  const r = await fetch(`${ASM_API}/v2/transcript/${id}`, {
    headers: { 'authorization': env.ASSEMBLYAI_KEY },
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    return err(`ASM 상태 확인 실패: ${r.status} ${t.slice(0, 150)}`, r.status, request, env);
  }
  const data = await r.json();
  // 클라이언트는 status/text/error 만 필요
  return ok({
    id: data.id,
    status: data.status,
    text: data.text || '',
    error: data.error || null,
    audio_duration: data.audio_duration || null,
  }, 200, request, env);
}

/* ═══════════════════════════════════════════
   JOB REGISTRATION
═══════════════════════════════════════════ */
async function handleRegisterJob(request, env) {
  let body;
  try { body = await request.json(); } catch { return err('Invalid JSON', 400, request, env); }

  let user;
  try { user = await requireUser(request, env, body); }
  catch (e) { return err(e.message, 401, request, env); }

  const { jobId, asmId, metadata } = body;
  if (!jobId || !asmId) return err('jobId, asmId required', 400, request, env);

  // 한도 차감 — 실제 노트가 만들어질 시점에 한 번
  try { await checkAndChargeQuota(env, user); }
  catch (e) { return err(e.message, e.status || 429, request, env); }

  await putJob(env, jobId, {
    uid: user.uid,
    email: user.email,
    asmId,
    metadata: metadata || {},
    status: 'transcribing',
    createdAt: Date.now(),
  });

  return ok({ ok: true, jobId }, 200, request, env);
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

  let text = body.text || '';

  if (!text && (body.transcript_id || body.id)) {
    const asmId = body.transcript_id || body.id;
    try {
      const r = await fetch(`${ASM_API}/v2/transcript/${asmId}`, {
        headers: { authorization: env.ASSEMBLYAI_KEY },
      });
      const d = await r.json();
      text = d.text || '';
    } catch { /* ignore */ }
  }

  if (!text || text.trim().length < 5) {
    await putJob(env, jobId, { ...job, status: 'error', error: '음성 인식 결과가 비어있습니다' });
    return;
  }

  // transcript 글자수 상한 (LLM 비용 폭탄 방지)
  if (text.length > MAX_TRANSCRIPT_CHARS) {
    console.warn(`[Webhook] transcript truncated: ${text.length} → ${MAX_TRANSCRIPT_CHARS}`);
    text = text.slice(0, MAX_TRANSCRIPT_CHARS);
  }

  await putJob(env, jobId, { ...job, status: 'generating', transcript: text });

  try {
    const note = await generateNote(text, job.metadata || {}, env);
    await putJob(env, jobId, {
      ...job,
      status: 'done',
      note,
      transcript: text, // 재시도용으로 보존
      completedAt: Date.now(),
    });
  } catch (e) {
    // 실패해도 transcript 는 보존 → /retry-llm 으로 재시도 가능
    await putJob(env, jobId, { ...job, status: 'error', transcript: text, error: `노트 생성 실패: ${e.message}` });
  }
}

/* ═══════════════════════════════════════════
   JOB STATUS — webhook 실패 폴백 포함
═══════════════════════════════════════════ */
async function handleJobStatus(jobId, request, env, ctx) {
  if (!jobId) return err('jobId required', 400, request, env);

  let user;
  try { user = await requireUser(request, env); }
  catch (e) { return err(e.message, 401, request, env); }

  let job = await getJob(env, jobId);
  if (!job) return ok({ status: 'not_found' }, 404, request, env);

  // 본인 job 만 조회 가능
  if (job.uid !== user.uid && !isOwner(user.email, env)) {
    return err('Forbidden', 403, request, env);
  }

  // 'transcribing' 5초 이상 → ASM 직접 체크
  if (job.status === 'transcribing' && job.asmId) {
    const ageSec = (Date.now() - (job.createdAt || 0)) / 1000;
    if (ageSec > 5) {
      try {
        const r = await fetch(`${ASM_API}/v2/transcript/${job.asmId}`, {
          headers: { authorization: env.ASSEMBLYAI_KEY },
        });
        const asmData = await r.json();
        if (asmData.status === 'completed' && asmData.text) {
          let text = asmData.text;
          if (text.length > MAX_TRANSCRIPT_CHARS) text = text.slice(0, MAX_TRANSCRIPT_CHARS);
          job.status = 'generating';
          job.transcript = text;
          await putJob(env, jobId, job);
          if (ctx && ctx.waitUntil) {
            ctx.waitUntil((async () => {
              const fresh = await getJob(env, jobId);
              if (!fresh || fresh.status === 'done') return;
              try {
                const note = await generateNote(text, fresh.metadata || {}, env);
                await putJob(env, jobId, { ...fresh, status: 'done', note, transcript: text, completedAt: Date.now() });
              } catch (e) {
                await putJob(env, jobId, { ...fresh, status: 'error', transcript: text, error: `노트 생성 실패: ${e.message}` });
              }
            })());
          }
        } else if (asmData.status === 'error') {
          job = { ...job, status: 'error', error: asmData.error || '음성 인식 실패' };
          await putJob(env, jobId, job);
        }
      } catch (e) { /* swallow */ }
    }
  }

  // 민감 정보 strip — transcript / uid 등은 클라에 안 줌
  const { transcript: _tr, uid: _u, email: _e, asmId: _a, ...safe } = job;
  return ok(safe, 200, request, env);
}

/* ═══════════════════════════════════════════
   /retry-llm/:jobId — 저장된 transcript 로 LLM 만 재실행
═══════════════════════════════════════════ */
async function handleRetryLlm(jobId, request, env, ctx) {
  if (!jobId) return err('jobId required', 400, request, env);

  let user;
  try { user = await requireUser(request, env); }
  catch (e) { return err(e.message, 401, request, env); }

  const job = await getJob(env, jobId);
  if (!job) return err('not_found', 404, request, env);
  if (job.uid !== user.uid && !isOwner(user.email, env)) {
    return err('Forbidden', 403, request, env);
  }
  if (!job.transcript || job.transcript.trim().length < 5) {
    return err('transcript 없음 — STT 부터 다시 해야 합니다', 409, request, env);
  }

  await putJob(env, jobId, { ...job, status: 'generating', error: null });

  ctx.waitUntil((async () => {
    try {
      const note = await generateNote(job.transcript, job.metadata || {}, env);
      const fresh = await getJob(env, jobId);
      await putJob(env, jobId, { ...(fresh || job), status: 'done', note, completedAt: Date.now(), error: null });
    } catch (e) {
      const fresh = await getJob(env, jobId);
      await putJob(env, jobId, { ...(fresh || job), status: 'error', error: `노트 재생성 실패: ${e.message}` });
    }
  })());

  return ok({ ok: true, jobId }, 200, request, env);
}

/* ═══════════════════════════════════════════
   /generate-note — 클라이언트가 transcript 보내면 노트 생성
   클라이언트 LLM 직접 호출 경로를 대체 (단일 경로 = 동일 품질)
═══════════════════════════════════════════ */
async function handleGenerateNote(request, env) {
  let body;
  try { body = await request.json(); } catch { return err('Invalid JSON', 400, request, env); }

  let user;
  try { user = await requireUser(request, env, body); }
  catch (e) { return err(e.message, 401, request, env); }

  const transcript = (body.transcript || '').toString();
  if (!transcript || transcript.trim().length < 5) {
    return err('transcript 가 비어있습니다', 400, request, env);
  }

  const metadata = (body.metadata && typeof body.metadata === 'object') ? body.metadata : {};

  try {
    const note = await generateNote(transcript, metadata, env);
    return ok({
      note,
      model: note._genModel || 'unknown',
      llmErrors: note._llmErrors || [],
    }, 200, request, env);
  } catch (e) {
    return err('노트 생성 실패: ' + (e.message || e), 500, request, env);
  }
}

/* ═══════════════════════════════════════════
   NOTE GENERATION (Claude Sonnet → Gemini Pro → Haiku → smartExtract)
═══════════════════════════════════════════ */
const NOTE_SCHEMA_GEMINI = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    recipes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          type: { type: 'string', enum: ['recipe', 'theory'] },
          classType: { type: 'string', enum: ['실습', '이론'] },
          content: { type: 'string' },
          ingredients: { type: 'array', items: { type: 'string' } },
          tips: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'type', 'classType', 'content', 'ingredients', 'tips'],
      },
    },
  },
  required: ['title', 'recipes'],
};

const NOTE_TOOL = {
  name: 'save_class_note',
  description: '조리학과 수업 녹음에서 추출한 노트를 저장한다. 한 수업에 여러 요리가 있으면 recipes 에 분리.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      recipes: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            type: { type: 'string', enum: ['recipe', 'theory'] },
            classType: { type: 'string', enum: ['실습', '이론'] },
            content: { type: 'string' },
            ingredients: { type: 'array', items: { type: 'string' } },
            tips: { type: 'array', items: { type: 'string' } },
          },
          required: ['title', 'type', 'classType', 'content', 'ingredients', 'tips'],
        },
      },
    },
    required: ['title', 'recipes'],
  },
};

async function generateNote(transcript, metadata, env) {
  // 입력 상한 한번 더 (방어적)
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    transcript = transcript.slice(0, MAX_TRANSCRIPT_CHARS);
  }

  const { duration = 0, memos = [] } = metadata;

  const memoSection = memos.length
    ? `\n[학생이 수업 중 직접 메모한 내용 — 반드시 노트에 자연스럽게 통합할 것]\n${memos.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n`
    : '';

  const durHint = duration ? `\n[참고: 녹음 길이 ${Math.round(duration/60)}분]\n` : '';

  const prompt = `당신은 한국 조리학과 학생의 수업 녹음을 정리하는 전문 셰프 노트 정리사입니다.
학생이 시험 전에 이 노트만 보고도 요리를 재현할 수 있도록 정밀하게 정리해야 합니다.
${memoSection}${durHint}
=== 수업 녹취 ===
"""
${transcript}
"""
=== 녹취 끝 ===

【작업 지침】

1. 수업 분류
   - 실제 조리 / 손질 / 실습 → type="recipe", classType="실습"
   - 이론 / 역사 / 위생 / 영양학 / 서비스 / 평가 → type="theory", classType="이론"

2. 여러 요리 분리
   한 수업에서 명확히 다른 메뉴를 다루면 recipes 배열에 각각 분리.
   예) "오늘은 토마토 소스랑 알르망드 소스 두 개" → recipes 2개
   예) "오늘 등심 스테이크 만들고 그 다음 감자 퓨레" → recipes 2개
   단, 한 요리의 곁들임/소스는 같은 recipe content 안에 통합.

3. 제목 (title)
   요리명을 정확하게. "수업 노트", "오늘의 수업" 같은 두루뭉술한 제목 금지.
   교수가 부른 이름 그대로 쓰되, 한글이 자연스러우면 한글로.
   예) "비프 부르기뇽", "닭다리살 콩피", "홀랜다이즈 소스"

4. 재료 (ingredients) — 실습일 때만
   - 형식: "재료명 + 정확한 용량/단위" (예: "양파 1/2개", "버터 30g", "올리브유 2큰술")
   - 교수가 언급한 모든 재료. 빠뜨리지 말 것.
   - 용량 불명이면 "재료명 (적당량)" 또는 그냥 "재료명".
   - 같은 재료가 여러 번 쓰이면 합쳐서 한 줄.

5. 본문 (content) — 가장 중요
   조리 순서를 단계별로, "\\n" 줄바꿈으로 분리.
   각 단계는 다음을 최대한 포함:
   - 동작 (썰다 / 볶다 / 끓이다 / 굽다 / 졸이다…)
   - 온도 / 시간 (예: "180도에서 15분", "센 불 3분")
   - 상태 판단 기준 (예: "갈색이 날 때까지", "물기가 날아갈 때까지")
   - 도구 / 기물 (팬 종류, 칼 종류 등 교수가 강조한 경우)

   금지 사항:
   ❌ "맛있게 만든다", "잘 익힌다" 같은 추상적 표현
   ❌ 녹취에 없는 내용을 지어내기
   ❌ 단계를 압축해서 누락하기 — 교수가 말한 디테일 다 살리기

   이론 수업이면 content 에 학습 내용을 항목별로 정리 (역사 → 종류 → 특징 등 논리적 흐름).

6. 팁 (tips) — 매우 중요
   교수가 강조한 핵심 포인트를 추출. 다음 신호를 잡아라:
   - "중요해요", "꼭", "반드시", "주의", "포인트", "절대"
   - "이게 망하면…", "이거 안 하면…", "시험 때…"
   - 실수했을 때 어떻게 되는지 설명한 부분
   - 노하우 / 비법 / 셰프의 개인적 견해

   각 tip 은 완결된 문장으로. "왜" 까지 포함하면 best.
   예) "양파는 약불에서 천천히 볶아야 단맛이 제대로 빠진다 — 센 불이면 탄맛만 남음"
   예) "버터는 차갑게 유지해야 머랭처럼 부풀어 — 녹으면 처음부터 다시"

7. 학생 메모 통합
   위 [학생 메모] 가 있으면 해당 단계 / 팁에 자연스럽게 녹여넣기. 별도 섹션으로 두지 말 것.

8. 사실 충실
   녹취에 없는 정보는 추가하지 말 것. 음성 인식 오류가 의심되면 (예: "토마토" 가 "고마토" 로 잘못 들림) 맥락으로 자연스럽게 교정.

【출력】 위 형식의 JSON 만 출력. 다른 설명 없이.`;

  let parsed = null;
  let usedModel = '';
  const llmErrors = [];

  // 1) Claude Sonnet 4.5 — 가장 이해력 좋음, 한국어 조리 용어 최강
  if (env.CLAUDE_KEY) {
    try {
      const res = await fetch(`${ANTHROPIC_API}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': env.CLAUDE_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 8000,
          temperature: 0.3,
          tools: [NOTE_TOOL],
          tool_choice: { type: 'tool', name: NOTE_TOOL.name },
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const toolUse = (data.content || []).find(b => b.type === 'tool_use');
        if (toolUse?.input) {
          parsed = toolUse.input;
          usedModel = 'claude-sonnet-4-5';
        } else {
          const raw = data.content?.find(b => b.type === 'text')?.text || '';
          parsed = parseClaudeJSON(raw);
          if (parsed) usedModel = 'claude-sonnet-4-5(text)';
          else llmErrors.push('Sonnet: tool_use 없음 + JSON 파싱 실패');
        }
      } else {
        const t = (await res.text()).slice(0, 200);
        console.warn('[Claude Sonnet]', res.status, t);
        llmErrors.push(`Sonnet HTTP ${res.status}: ${t}`);
      }
    } catch (e) {
      console.warn('[Claude Sonnet] error:', e.message);
      llmErrors.push('Sonnet 예외: ' + e.message);
    }
  } else {
    llmErrors.push('CLAUDE_KEY 미설정');
  }

  // 2) Gemini 2.5 Pro 백업 — Flash 보다 이해도 좋음
  if (!parsed && env.GEMINI_KEY) {
    try {
      const gres = await fetch(
        `https://gateway.ai.cloudflare.com/v1/d872f29764b5c5b238824decd2dc6d91/chefnote/google-ai-studio/v1beta/models/gemini-2.5-pro:generateContent`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': env.GEMINI_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: NOTE_SCHEMA_GEMINI,
              temperature: 0.3,
              maxOutputTokens: 8000,
            },
          }),
        }
      );
      if (gres.ok) {
        const gdata = await gres.json();
        const raw = gdata.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (raw) {
          parsed = parseClaudeJSON(raw);
          if (parsed) usedModel = 'gemini-2.5-pro';
          else llmErrors.push('Gemini Pro: JSON 파싱 실패');
        } else {
          llmErrors.push('Gemini Pro: 빈 응답 (' + JSON.stringify(gdata).slice(0, 120) + ')');
        }
      } else {
        const t = (await gres.text()).slice(0, 200);
        console.warn('[Gemini Pro]', gres.status, t);
        llmErrors.push(`Gemini Pro HTTP ${gres.status}: ${t}`);
      }
    } catch (e) {
      console.warn('[Gemini Pro] error:', e.message);
      llmErrors.push('Gemini Pro 예외: ' + e.message);
    }
  } else if (!parsed && !env.GEMINI_KEY) {
    llmErrors.push('GEMINI_KEY 미설정');
  }

  // 3) Claude Haiku 마지막 백업
  if (!parsed && env.CLAUDE_KEY) {
    try {
      const res = await fetch(`${ANTHROPIC_API}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': env.CLAUDE_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 4000,
          temperature: 0.3,
          tools: [NOTE_TOOL],
          tool_choice: { type: 'tool', name: NOTE_TOOL.name },
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const toolUse = (data.content || []).find(b => b.type === 'tool_use');
        if (toolUse?.input) {
          parsed = toolUse.input;
          usedModel = 'claude-haiku-4-5';
        } else {
          llmErrors.push('Haiku: tool_use 없음');
        }
      } else {
        const t = (await res.text()).slice(0, 200);
        console.warn('[Claude Haiku]', res.status, t);
        llmErrors.push(`Haiku HTTP ${res.status}: ${t}`);
      }
    } catch (e) {
      console.warn('[Claude Haiku] error:', e.message);
      llmErrors.push('Haiku 예외: ' + e.message);
    }
  }

  // 셋 다 실패 → smartExtract
  if (!parsed) {
    console.warn('[NoteGen] LLM 전부 실패 — smartExtract 사용 / 원인:', llmErrors.join(' | '));
    parsed = smartExtract(transcript);
    usedModel = 'smartExtract';
  }
  console.log('[NoteGen] used:', usedModel);

  parsed = coerceGeneratedNote(parsed, transcript);

  if (!parsed.recipes || !Array.isArray(parsed.recipes) || !parsed.recipes.length) {
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
    _genModel: usedModel,
    _llmErrors: usedModel === 'smartExtract' ? llmErrors : undefined,
    ...parsed,
  };
}

function coerceGeneratedNote(parsed, transcript) {
  const fallback = smartExtract(transcript);
  const out = (parsed && typeof parsed === 'object') ? { ...parsed } : {};

  if (!Array.isArray(out.recipes) || !out.recipes.length) {
    return fallback;
  }

  let hasMeaningfulContent = false;
  out.recipes = out.recipes.map((r, i) => {
    const base = (r && typeof r === 'object') ? { ...r } : {};
    const fb = (fallback.recipes && fallback.recipes[i]) || fallback.recipes[0] || {};

    base.title = String(base.title || '').trim() || String(fb.title || out.title || '레시피');
    base.type = (base.type === 'recipe' || base.type === 'theory') ? base.type : (fb.type || 'recipe');
    base.classType = (base.classType === '실습' || base.classType === '이론') ? base.classType : (fb.classType || (base.type === 'theory' ? '이론' : '실습'));
    base.content = String(base.content || '').trim();
    if (!base.content) base.content = String(fb.content || '').trim();

    base.ingredients = Array.isArray(base.ingredients) ? base.ingredients.filter(Boolean) : (Array.isArray(fb.ingredients) ? fb.ingredients : []);
    base.tips = Array.isArray(base.tips) ? base.tips.filter(Boolean) : (Array.isArray(fb.tips) ? fb.tips : []);

    if (base.content && base.content.length >= 8) hasMeaningfulContent = true;
    return base;
  });

  if (!hasMeaningfulContent) return fallback;

  out.title = String(out.title || '').trim() || String(fallback.title || '수업 노트');
  return out;
}

function parseClaudeJSON(raw) {
  if (!raw) return null;

  const text = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  const candidate = extractLikelyJson(text);
  if (!candidate) return null;

  const attempts = [
    candidate,
    candidate.replace(/,\s*([}\]])/g, '$1'),
    repairJsonStringNewlines(candidate),
    repairJsonStringNewlines(candidate.replace(/,\s*([}\]])/g, '$1')),
    repairJsonLenient(candidate),
    repairJsonLenient(repairJsonStringNewlines(candidate)),
  ];

  for (const a of attempts) {
    try { return JSON.parse(a); } catch { /* next */ }
  }
  return null;
}

function repairJsonStringNewlines(s) {
  let out = '';
  let inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { out += c; esc = false; continue; }
    if (c === '\\') { out += c; esc = true; continue; }
    if (c === '"') { inStr = !inStr; out += c; continue; }
    if (inStr) {
      if (c === '\n') { out += '\\n'; continue; }
      if (c === '\r') { out += '\\r'; continue; }
      if (c === '\t') { out += '\\t'; continue; }
    }
    out += c;
  }
  return out;
}

function extractLikelyJson(text) {
  if (!text) return null;
  const starts = ['{', '['];
  let best = null;
  for (const ch of starts) {
    const idx = text.indexOf(ch);
    if (idx < 0) continue;
    const sub = text.slice(idx);
    const end = findBalancedJsonEnd(sub);
    if (end > 0) {
      const cand = sub.slice(0, end);
      if (!best || cand.length > best.length) best = cand;
    }
  }
  return best;
}

function findBalancedJsonEnd(s) {
  let inStr = false;
  let esc = false;
  let quote = '"';
  const st = [];

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === quote) { inStr = false; continue; }
      continue;
    }
    if (c === '"' || c === '\'') { inStr = true; quote = c; continue; }
    if (c === '{' || c === '[') st.push(c);
    else if (c === '}' || c === ']') {
      const top = st[st.length - 1];
      if (!top) return -1;
      if ((top === '{' && c === '}') || (top === '[' && c === ']')) st.pop();
      else return -1;
      if (!st.length) return i + 1;
    }
  }
  return -1;
}

function repairJsonLenient(input) {
  let s = String(input || '');
  s = s.replace(/^﻿/, '');
  s = s
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, '\'')
    .replace(/ /g, ' ');

  let out = '';
  let i = 0;
  const stack = [];

  function ctx() { return stack[stack.length - 1] || null; }
  function isWs(ch) { return ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t'; }
  function isNumStart(ch) { return ch === '-' || (ch >= '0' && ch <= '9'); }
  function isIdentStart(ch) {
    const code = ch ? ch.charCodeAt(0) : 0;
    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || ch === '_' || ch === '$';
  }
  function isValueStart(ch) {
    return ch === '{' || ch === '[' || ch === '"' || ch === '\'' || isNumStart(ch) || isIdentStart(ch);
  }
  function markValueDone() {
    const c = ctx();
    if (!c) return;
    if (c.type === 'array') c.state = 'comma_or_end';
    else if (c.type === 'object' && c.state === 'value') c.state = 'comma_or_end';
  }
  function ensureCommaIfNeeded(ch) {
    const c = ctx();
    if (!c) return;
    if (c.type === 'array' && c.state === 'comma_or_end' && isValueStart(ch)) {
      out += ',';
      c.state = 'value_or_end';
    } else if (c.type === 'object' && c.state === 'comma_or_end' && (ch === '"' || ch === '\'' || isIdentStart(ch))) {
      out += ',';
      c.state = 'key_or_end';
    }
  }
  function parseString() {
    const q = s[i];
    i++;
    let str = '';
    while (i < s.length) {
      const ch = s[i++];
      if (ch === q) break;
      if (ch === '\\') {
        if (i >= s.length) { str += '\\\\'; break; }
        const nx = s[i++];
        if ('"\\/bfnrtu'.includes(nx)) {
          if (nx === 'u') {
            const hex = s.slice(i, i + 4);
            if (/^[0-9a-fA-F]{4}$/.test(hex)) {
              str += '\\u' + hex;
              i += 4;
            } else {
              str += '\\\\u';
            }
          } else {
            str += '\\' + nx;
          }
        } else {
          str += '\\\\' + nx;
        }
        continue;
      }
      if (ch === '\n') { str += '\\n'; continue; }
      if (ch === '\r') { str += '\\r'; continue; }
      if (ch === '\t') { str += '\\t'; continue; }
      if (ch < ' ') { str += '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'); continue; }
      if (ch === '"') { str += '\\"'; continue; }
      str += ch;
    }
    out += '"' + str + '"';
  }
  function parseNumberOrLiteral() {
    const stIdx = i;
    while (i < s.length) {
      const ch = s[i];
      if (isWs(ch) || ch === ',' || ch === ':' || ch === '}' || ch === ']') break;
      i++;
    }
    let tok = s.slice(stIdx, i).trim();
    if (!tok) return;
    if (tok === 'True') tok = 'true';
    else if (tok === 'False') tok = 'false';
    else if (tok === 'None') tok = 'null';
    out += tok;
  }
  function parseUnquotedKey() {
    const stIdx = i;
    while (i < s.length) {
      const ch = s[i];
      if (isWs(ch) || ch === ':' || ch === ',' || ch === '}') break;
      i++;
    }
    const key = s.slice(stIdx, i).trim();
    out += '"' + key.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  while (i < s.length) {
    const ch = s[i];
    if (isWs(ch)) { i++; continue; }

    if (ch === '/' && s[i + 1] === '/') {
      i += 2;
      while (i < s.length && s[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && s[i + 1] === '*') {
      i += 2;
      while (i + 1 < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    ensureCommaIfNeeded(ch);
    const c = ctx();

    if (ch === '{') {
      if (c && c.type === 'object' && c.state === 'value') markValueDone();
      out += '{';
      stack.push({ type: 'object', state: 'key_or_end' });
      i++;
      continue;
    }
    if (ch === '[') {
      if (c && c.type === 'object' && c.state === 'value') markValueDone();
      out += '[';
      stack.push({ type: 'array', state: 'value_or_end' });
      i++;
      continue;
    }
    if (ch === '}' || ch === ']') {
      const cur = ctx();
      if (cur && cur.type === 'object' && cur.state === 'colon') out += 'null';
      if (cur && cur.type === 'object' && cur.state === 'value') out += 'null';
      out += ch;
      stack.pop();
      i++;
      markValueDone();
      continue;
    }
    if (ch === ',') {
      if (c) {
        if (c.type === 'array') c.state = 'value_or_end';
        else if (c.type === 'object') c.state = 'key_or_end';
      }
      out += ',';
      i++;
      continue;
    }
    if (ch === ':') {
      if (c && c.type === 'object') c.state = 'value';
      out += ':';
      i++;
      continue;
    }

    if (ch === '"' || ch === '\'') {
      parseString();
      const cur = ctx();
      if (cur && cur.type === 'object') {
        if (cur.state === 'key_or_end') cur.state = 'colon';
        else if (cur.state === 'value') cur.state = 'comma_or_end';
      } else if (cur && cur.type === 'array') {
        cur.state = 'comma_or_end';
      }
      continue;
    }

    if (c && c.type === 'object' && c.state === 'key_or_end' && isIdentStart(ch)) {
      parseUnquotedKey();
      c.state = 'colon';
      continue;
    }

    parseNumberOrLiteral();
    markValueDone();
  }

  out = out.replace(/,\s*([}\]])/g, '$1');
  return out;
}

function smartExtract(transcript) {
  const d = new Date().toLocaleDateString('ko-KR');
  const recipeKw = ['재료', '계량', '손질', '조리', '볶', '끓', '굽', '튀기', '레시피', '소금', '설탕', '기름', '양념', '밀가루', '달걀', '버터', '육수'];
  const score = recipeKw.filter(k => transcript.includes(k)).length;
  const isRecipe = score >= 2;

  const sentences = transcript
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?。])\s+/)
    .filter(s => s.length > 15)
    .slice(0, 12);

  const content = sentences.join('\n') || transcript.slice(0, 1200);
  const ingMatches = transcript.match(/[\w가-힣]+\s*\d+[\w가-힣]*/g) || [];
  const ingredients = isRecipe ? [...new Set(ingMatches)].slice(0, 8) : [];
  const tipKw = ['중요', '반드시', '꼭', '주의', '포인트', '핵심', 'tip', '팁'];
  const tips = sentences.filter(s => tipKw.some(k => s.includes(k))).slice(0, 4);
  const title = sentences[0]?.slice(0, 20).trim() || `수업 노트 ${d}`;

  return {
    title,
    recipes: [{
      id: 'r0',
      title,
      type: isRecipe ? 'recipe' : 'theory',
      classType: isRecipe ? '실습' : '이론',
      content,
      ingredients,
      tips,
      paragraphAttachments: {},
    }],
  };
}

/* ═══════════════════════════════════════════
   ANTHROPIC PROXY — 인증 필수
═══════════════════════════════════════════ */
async function handleAnthropicProxy(request, env, url) {
  let user;
  try { user = await requireUser(request, env); }
  catch (e) { return err(e.message, 401, request, env); }

  const targetPath = url.pathname.replace('/anthropic', '');
  const targetUrl = `${ANTHROPIC_API}${targetPath}${url.search}`;

  const cleanHeaders = {
    'x-api-key': env.CLAUDE_KEY,
    'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01',
    'content-type': 'application/json',
  };
  const beta = request.headers.get('anthropic-beta');
  if (beta) cleanHeaders['anthropic-beta'] = beta;

  let body = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: cleanHeaders,
    body,
  });

  const respText = await response.text();
  return new Response(respText, {
    status: response.status,
    headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json' },
  });
}

/* ═══════════════════════════════════════════
   GEMINI PROXY — 인증 필수
═══════════════════════════════════════════ */
async function handleGeminiProxy(request, env) {
  if (!env.GEMINI_KEY) {
    return err('GEMINI_KEY not configured', 500, request, env);
  }
  let body;
  try { body = await request.json(); } catch { return err('Invalid JSON body', 400, request, env); }

  let user;
  try { user = await requireUser(request, env, body); }
  catch (e) { return err(e.message, 401, request, env); }

  const model = body.model || 'gemini-2.5-flash';
  const targetUrl = `https://gateway.ai.cloudflare.com/v1/d872f29764b5c5b238824decd2dc6d91/chefnote/google-ai-studio/v1beta/models/${model}:generateContent`;
  const generationConfig = {
    responseMimeType: 'application/json',
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.2,
    maxOutputTokens: body.maxOutputTokens || 2500,
  };
  if (body.responseSchema && typeof body.responseSchema === 'object') {
    generationConfig.responseSchema = body.responseSchema;
  }

  // 입력 prompt 길이 상한
  const promptText = (body.prompt || '').toString();
  if (promptText.length > MAX_TRANSCRIPT_CHARS + 5000) {
    return err('prompt 가 너무 깁니다', 413, request, env);
  }

  const payload = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig,
  };
  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': env.GEMINI_KEY,
      },
      body: JSON.stringify(payload),
    });
    const respText = await response.text();
    return new Response(respText, {
      status: response.status,
      headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return err('Gemini proxy error: ' + e.message, 502, request, env);
  }
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
