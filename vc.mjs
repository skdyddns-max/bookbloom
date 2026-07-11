import { chromium } from 'playwright-core'
const SS='/private/tmp/claude-501/-Users-nayong-unsmaegbug/769cca21-161e-4b4b-9f0b-8f307759305e/scratchpad'
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const pg=await (await b.newContext({viewport:{width:412,height:900},deviceScaleFactor:2})).newPage()
pg.on('pageerror',e=>console.log('ERR:',e.message))
await pg.goto('http://localhost:8036/',{waitUntil:'networkidle'})
// 1) 자동 편성: 3개월 생성 확인
const gen=await pg.evaluate(async()=>{const ch=await import('/src/lib/challenges.ts')
  const fmt=t=>ch.activeChallenges(t).map(c=>c.id+' | '+c.title).join(' || ')
  return {jul:fmt('2026-07-15'),aug:fmt('2026-08-15'),sep:fmt('2026-09-15')}})
console.log('JUL:',gen.jul); console.log('AUG:',gen.aug); console.log('SEP:',gen.sep)
// 2) 리더보드 UI: 앱에 아몬드 reading 시드 → 모임 → 참여 → 보드
const seed={version:1,settings:{yearlyGoal:24,aladinKey:'',kakaoKey:''},books:[{id:'am',title:'아몬드',author:'손원평',totalPages:264,category:'소설/시/희곡',status:'reading',rating:0,oneLine:'',createdAt:'2026-07-02T00:00:00Z'}],logs:[{id:'l1',bookId:'am',page:180,date:'2026-07-12',createdAt:'2026-07-12T00:00:00Z'}],notes:[]}
await pg.evaluate(s=>{localStorage.setItem('bookbloom_onboarded','1');localStorage.setItem('bookbloom_v1',JSON.stringify(s))},seed)
await pg.reload({waitUntil:'networkidle'});await pg.waitForTimeout(800)
const myPid=await pg.evaluate(()=>localStorage.getItem('bookbloom_pid'))
console.log('myPid:',myPid)
;(async()=>{})()
