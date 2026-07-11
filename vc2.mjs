import { chromium } from 'playwright-core'
const SS='/private/tmp/claude-501/-Users-nayong-unsmaegbug/769cca21-161e-4b4b-9f0b-8f307759305e/scratchpad'
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const pg=await (await b.newContext({viewport:{width:412,height:900},deviceScaleFactor:2})).newPage()
pg.on('pageerror',e=>console.log('ERR:',e.message))
await pg.goto('http://localhost:8036/',{waitUntil:'networkidle'})
const seed={version:1,settings:{yearlyGoal:24,aladinKey:'',kakaoKey:''},books:[{id:'am',title:'아몬드',author:'손원평',totalPages:264,category:'소설/시/희곡',status:'reading',rating:0,oneLine:'',createdAt:'2026-07-02T00:00:00Z'}],logs:[{id:'l1',bookId:'am',page:180,date:'2026-07-12',createdAt:'2026-07-12T00:00:00Z'}],notes:[]}
await pg.evaluate(s=>{localStorage.setItem('bookbloom_onboarded','1');localStorage.setItem('bookbloom_v1',JSON.stringify(s));localStorage.setItem('bookbloom_group',JSON.stringify({roomId:'x',roomName:'테스트',code:'X',memberId:'m',nickname:'용디',token:'t'}))},seed)
await pg.reload({waitUntil:'networkidle'});await pg.waitForTimeout(800)
const myPid=await pg.evaluate(()=>localStorage.getItem('bookbloom_pid'))
await pg.locator('.tabbar-btn',{hasText:'모임'}).click();await pg.waitForTimeout(1500)
// join first challenge (book of month)
await pg.locator('.challenge-card').first().locator('button',{hasText:'참여하기'}).click()
await pg.waitForTimeout(1800)
// open leaderboard on first card
await pg.locator('.challenge-card').first().locator('.challenge-board-toggle').click()
await pg.waitForTimeout(600)
console.log('board rows:',await pg.locator('.challenge-card').first().locator('.board-row').allTextContents())
const card=pg.locator('.challenge-card').first()
await card.scrollIntoViewIfNeeded();await pg.waitForTimeout(300)
await card.screenshot({path:SS+'/leaderboard.png'})
// cleanup my join across challenges
await pg.evaluate(async()=>{const ch=await import('/src/lib/challenges.ts');for(const c of ch.activeChallenges('2026-07-12')){await ch.challengeApi.leave(c)}})
console.log('myPid:',myPid)
await b.close();console.log('done')
