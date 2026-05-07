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
 *   JOBS              — KV namespace for job state
 *   ASSEMBLYAI_KEY    — AssemblyAI API key  (secret)
 *   CLAUDE_KEY        — Anthropic API key   (secret)
 */

const ASM_API = 'https://api.assemblyai.com';
// Cloudflare AI Gateway — direct Anthropic 호출이 edge WAF에 차단되므로 Gateway 경유
const ANTHROPIC_API = 'https://gateway.ai.cloudflare.com/v1/d872f29764b5c5b238824decd2dc6d91/chefnote/anthropic';

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
      return ok({ key: env.ASSEMBLYAI_KEY });
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
      return handleJobStatus(jobId, env, ctx);
    }

    // ── Anthropic proxy (existing) ──
    if (url.pathname.startsWith('/anthropic/')) {
      return handleAnthropicProxy(request, env, url);
    }

    // ── Gemini proxy (free tier primary) ──
    if (url.pathname === '/gemini/generate' && request.method === 'POST') {
      return handleGeminiProxy(request, env);
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
   JOB STATUS ENDPOINT — with webhook-failure fallback
   If job is stuck in 'transcribing', poll AssemblyAI directly + start Claude in background.
   Always responds quickly; heavy work happens in ctx.waitUntil.
═══════════════════════════════════════════ */
async function handleJobStatus(jobId, env, ctx) {
  if (!jobId) return err('jobId required', 400);
  let job = await getJob(env, jobId);
  if (!job) return ok({ status: 'not_found' }, 404);

  // ── Webhook fallback: 'transcribing' 상태가 5초 이상 지속되면 AssemblyAI 직접 체크 ──
  if (job.status === 'transcribing' && job.asmId) {
    const ageSec = (Date.now() - (job.createdAt || 0)) / 1000;
    if (ageSec > 5) {
      try {
        const r = await fetch(`${ASM_API}/v2/transcript/${job.asmId}`, {
          headers: { authorization: env.ASSEMBLYAI_KEY },
        });
        const asmData = await r.json();
        if (asmData.status === 'completed' && asmData.text) {
          // ASM 완료 → 'generating'으로 표시하고 Claude를 백그라운드로
          job.status = 'generating';
          await putJob(env, jobId, job);
          if (ctx && ctx.waitUntil) {
            ctx.waitUntil((async () => {
              const fresh = await getJob(env, jobId);
              if (!fresh || fresh.status === 'done') return; // already done
              try {
                const note = await generateNote(asmData.text, fresh.metadata || {}, env);
                await putJob(env, jobId, { ...fresh, status: 'done', note, completedAt: Date.now() });
              } catch (e) {
                await putJob(env, jobId, { ...fresh, status: 'error', error: `노트 생성 실패: ${e.message}` });
              }
            })());
          }
        } else if (asmData.status === 'error') {
          job = { ...job, status: 'error', error: asmData.error || '음성 인식 실패' };
          await putJob(env, jobId, job);
        }
      } catch (e) { /* swallow — keep status as is */ }
    }
  }

  // Strip sensitive data before returning
  const { idToken: _tok, transcript: _tr, ...safe } = job;
  return ok(safe);
}

/* ═══════════════════════════════════════════
   NOTE GENERATION (Gemini 1차 + Claude Haiku 백업)

   두 모델 모두 schema 강제 사용으로 깨진 JSON 자체가 발생할 수 없게 함.
   - Gemini : responseSchema (OpenAPI 3.0)
   - Claude : tool_use + tool_choice
   파싱 실패 시 트랜스크립트 기반 smartExtract 로 폴백 — 빈 노트 절대 안 만듦.
═══════════════════════════════════════════ */

// Gemini 용 OpenAPI 3.0 schema (responseSchema)
const NOTE_SCHEMA_GEMINI = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '수업 제목' },
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

// Claude tool_use 스키마
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
  const { duration = 0, memos = [] } = metadata;

  const memoSection = memos.length
    ? `\n수업 중 추가 메모 (반드시 반영):\n${memos.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n`
    : '';

  const prompt = `다음은 조리학과 수업 녹음을 텍스트로 변환한 내용입니다.
${memoSection}
텍스트:
"""
${transcript}
"""

이 수업 내용을 분석해 노트를 만들어주세요.

판단 기준:
- 실제 조리/요리/실습이면 type="recipe", classType="실습"
- 이론·역사·영양학·위생·서비스이면 type="theory", classType="이론"
- 한 수업에 여러 요리가 명확히 구분되면 recipes 에 각각 분리 (예: 토마토 소스 + 알르망드 소스 → recipes 2개)
- content 는 단계별로 \\n 으로 줄바꿈
- ingredients 는 "재료명 + 용량" 형식 (예: "당근 50g"). 이론 수업이면 빈 배열`;

  let parsed = null;
  let usedModel = '';

  // 1) Gemini 2.5 Flash (responseSchema 강제) — 무료, 한국어 우수
  if (env.GEMINI_KEY) {
    try {
      const gres = await fetch(
        `https://gateway.ai.cloudflare.com/v1/d872f29764b5c5b238824decd2dc6d91/chefnote/google-ai-studio/v1beta/models/gemini-2.5-flash:generateContent`,
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
              temperature: 0.2,
              maxOutputTokens: 2500,
            },
          }),
        }
      );
      if (gres.ok) {
        const gdata = await gres.json();
        const raw = gdata.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (raw) {
          parsed = parseClaudeJSON(raw);
          if (parsed) usedModel = 'gemini-2.5-flash';
          else console.warn('[Gemini] responseSchema 했는데도 파싱 실패:', raw.slice(0, 200));
        }
      } else {
        console.warn('[Gemini]', gres.status, (await gres.text()).slice(0, 200));
      }
    } catch (e) {
      console.warn('[Gemini] error:', e.message);
    }
  }

  // 2) Claude Haiku (tool_use 강제) — 백업
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
          max_tokens: 2500,
          temperature: 0.2,
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
          // 모델이 도구 미사용 시 텍스트 폴백
          const raw = data.content?.find(b => b.type === 'text')?.text || '';
          parsed = parseClaudeJSON(raw);
          if (parsed) usedModel = 'claude-haiku-4-5(text)';
        }
      } else {
        console.warn('[Claude]', res.status, (await res.text()).slice(0, 200));
      }
    } catch (e) {
      console.warn('[Claude] error:', e.message);
    }
  }

  // 3) 둘 다 실패 → 트랜스크립트에서 직접 추출 (빈 노트 절대 안 만듦)
  if (!parsed) {
    console.warn('[NoteGen] LLM 둘 다 실패 — smartExtract 사용');
    parsed = smartExtract(transcript);
    usedModel = 'smartExtract';
  }
  console.log('[NoteGen] used:', usedModel);

  // Normalize recipes array
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
    ...parsed,
  };
}

/* Robust JSON extraction. Handles code fences, prose prefix, trailing commas,
   and literal newlines/tabs/CRs inside string values. Returns parsed object or null. */
function parseClaudeJSON(raw) {
  if (!raw) return null;
  const text = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first < 0 || last <= first) return null;
  const candidate = text.slice(first, last + 1);
  const attempts = [
    candidate,
    candidate.replace(/,\s*([}\]])/g, '$1'),
    repairJsonStringNewlines(candidate),
    repairJsonStringNewlines(candidate.replace(/,\s*([}\]])/g, '$1')),
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

/* 트랜스크립트에서 직접 노트 추출 (LLM 둘 다 실패 시 최후 폴백) */
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
   ANTHROPIC PROXY — pass only minimal headers (avoid 403 from edge WAF)
═══════════════════════════════════════════ */
async function handleAnthropicProxy(request, env, url) {
  const targetPath = url.pathname.replace('/anthropic', '');
  const targetUrl = `${ANTHROPIC_API}${targetPath}${url.search}`;

  // 클라이언트 헤더 전부를 forward하면 Anthropic edge WAF가 차단함.
  // 정확히 필요한 헤더만 새로 만들어서 보내기.
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
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/* ═══════════════════════════════════════════
   GEMINI PROXY — Google Generative Language API
   무료 티어: gemini-2.5-flash 250 req/day, 한국어 우수, 구조화 JSON 안정
═══════════════════════════════════════════ */
async function handleGeminiProxy(request, env) {
  if (!env.GEMINI_KEY) {
    return err('GEMINI_KEY not configured', 500);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 400);
  }
  // body: { prompt: string, model?: string, temperature?: number, maxOutputTokens?: number }
  const model = body.model || 'gemini-2.5-flash';
  // CF AI Gateway 경유 — Worker 리전이 Gemini 미지원 지역일 때 우회
  const targetUrl = `https://gateway.ai.cloudflare.com/v1/d872f29764b5c5b238824decd2dc6d91/chefnote/google-ai-studio/v1beta/models/${model}:generateContent`;
  const generationConfig = {
    responseMimeType: 'application/json',
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.2,
    maxOutputTokens: body.maxOutputTokens || 2500,
  };
  // 클라이언트가 responseSchema 를 명시한 경우 forward (Gemini 가 schema 강제하여 깨진 JSON 안 나옴)
  if (body.responseSchema && typeof body.responseSchema === 'object') {
    generationConfig.responseSchema = body.responseSchema;
  }
  const payload = {
    contents: [{ parts: [{ text: body.prompt }] }],
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
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return err('Gemini proxy error: ' + e.message, 502);
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
