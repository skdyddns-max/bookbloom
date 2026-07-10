// 알라딘 OpenAPI CORS 프록시 + TTB 구매 링크(적립 attribution) — 키는 Supabase secret에만 존재
const KEY = Deno.env.get('ALADIN_TTB_KEY') ?? ''
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const url = new URL(req.url)
  const op = url.searchParams.get('op')

  if (op === 'search' || op === 'lookup') {
    let target = ''
    if (op === 'search') {
      const q = url.searchParams.get('query') ?? ''
      const start = url.searchParams.get('start') ?? '1'
      target =
        `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${KEY}` +
        `&Query=${encodeURIComponent(q)}&QueryType=Keyword&MaxResults=20&start=${start}` +
        `&SearchTarget=Book&output=js&Version=20131101&Cover=Big`
    } else {
      const isbn = url.searchParams.get('isbn') ?? ''
      target =
        `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${KEY}` +
        `&itemIdType=ISBN13&ItemId=${encodeURIComponent(isbn)}&output=js&Version=20131101&Cover=Big`
    }
    const res = await fetch(target)
    const body = await res.text()
    return new Response(body, {
      status: res.status,
      headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  // 구매 링크: TTB 키를 붙여 상품페이지로 302 리다이렉트 (구매 시 3% 적립 attribution)
  if (op === 'buy') {
    const isbn = url.searchParams.get('isbn') ?? ''
    const title = url.searchParams.get('t') ?? ''
    let dest = ''
    if (/^\d{13}$/.test(isbn)) {
      try {
        const look = await fetch(
          `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${KEY}` +
            `&itemIdType=ISBN13&ItemId=${isbn}&output=js&Version=20131101`,
        )
        const j = await look.json()
        const link = j?.item?.[0]?.link as string | undefined
        if (link) dest = link.replace(/&amp;/g, '&') + `&ttbkey=${KEY}`
      } catch {
        // fall through to search
      }
    }
    if (!dest) {
      dest =
        `https://www.aladin.co.kr/search/wsearchresult.aspx?SearchWord=${encodeURIComponent(title)}` +
        `&ttbkey=${KEY}`
    }
    return new Response(null, { status: 302, headers: { ...CORS, Location: dest } })
  }

  return new Response(JSON.stringify({ error: 'bad op' }), {
    status: 400,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
