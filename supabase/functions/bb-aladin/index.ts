// 알라딘 OpenAPI CORS 프록시 — 키는 Supabase secret(ALADIN_TTB_KEY)에만 존재
const KEY = Deno.env.get('ALADIN_TTB_KEY') ?? ''
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const url = new URL(req.url)
  const op = url.searchParams.get('op')
  let target = ''
  if (op === 'search') {
    const q = url.searchParams.get('query') ?? ''
    const start = url.searchParams.get('start') ?? '1'
    target =
      `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${KEY}` +
      `&Query=${encodeURIComponent(q)}&QueryType=Keyword&MaxResults=20&start=${start}` +
      `&SearchTarget=Book&output=js&Version=20131101&Cover=Big`
  } else if (op === 'lookup') {
    const isbn = url.searchParams.get('isbn') ?? ''
    target =
      `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${KEY}` +
      `&itemIdType=ISBN13&ItemId=${encodeURIComponent(isbn)}&output=js&Version=20131101&Cover=Big`
  } else {
    return new Response(JSON.stringify({ error: 'bad op' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
  const res = await fetch(target)
  const body = await res.text()
  return new Response(body, {
    status: res.status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  })
})
