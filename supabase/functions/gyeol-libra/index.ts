// 결 사서 — 서버에서만 Anthropic 키 사용(클라이언트 비노출). 추천/상담 2가지 op.
const KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'content-type': 'application/json',
}

const SYSTEM = `당신은 '결'이라는 독서 기록 앱의 사서입니다. 이름은 '결 사서'.
말투: 따뜻한 존댓말, 부드럽고 간결하게. 재촉·훈계 금지. 이모지는 아껴서.
독자의 서재(완독 책·별점·한줄평·좋아하는 분야·독서 성향)를 근거로 답합니다.
실존하는 책만 추천하세요. 확실하지 않은 책은 추천하지 마세요.`

interface Payload {
  op: 'recommend' | 'ask'
  library: string // 서재 요약 텍스트
  question?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (!KEY) return new Response(JSON.stringify({ error: 'no key' }), { status: 500, headers: CORS })

  let p: Payload
  try {
    p = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'bad request' }), { status: 400, headers: CORS })
  }
  const library = String(p.library ?? '').slice(0, 4000)
  const question = String(p.question ?? '').slice(0, 500)

  let user = ''
  if (p.op === 'recommend') {
    user = `아래는 독자의 서재입니다.

${library}

이 독자에게 다음에 읽을 책 3권을 추천해 주세요. 서재의 취향(별점 높은 책·분야·성향)을 근거로,
이미 서재에 있는 책은 제외하고, 한국에서 구할 수 있는 실존 도서만.

반드시 아래 JSON 형식으로만 답하세요(다른 텍스트 없이):
{"recs":[{"title":"제목","author":"지은이","reason":"이 독자에게 권하는 이유 1~2문장(존댓말)"}],"note":"서재를 보고 느낀 점 한 문장(존댓말)"}`
  } else if (p.op === 'ask') {
    if (!question) return new Response(JSON.stringify({ error: 'no question' }), { status: 400, headers: CORS })
    user = `아래는 독자의 서재입니다.

${library}

독자의 질문: ${question}

독서·책에 관한 질문이면 서재를 참고해 3~5문장으로 따뜻하게 답해 주세요.
독서와 무관한 질문이면 "저는 책 이야기를 나누는 사서예요"라고 부드럽게 안내해 주세요.`
  } else {
    return new Response(JSON.stringify({ error: 'bad op' }), { status: 400, headers: CORS })
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 900,
        system: SYSTEM,
        messages: [{ role: 'user', content: user }],
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      return new Response(JSON.stringify({ error: 'upstream', detail: detail.slice(0, 300) }), {
        status: 502, headers: CORS,
      })
    }
    const out = await res.json()
    const text = (out.content ?? []).map((c: { text?: string }) => c.text ?? '').join('')
    return new Response(JSON.stringify({ text }), { headers: CORS })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e).slice(0, 200) }), { status: 500, headers: CORS })
  }
})
