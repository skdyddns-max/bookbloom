# 북블룸 (BookBloom)

성인 독서관리 웹앱 (PWA). 기획서: [docs/기획서.md](docs/기획서.md)

## 스택·실행
- Vite + React + TS, 데이터는 localStorage(`bookbloom_v1`) — 서버 없음
- 개발: `npm run dev` → http://localhost:8033
- 빌드: `npm run build` (tsc -b 포함, dist/)
- 배포: GitHub Actions → GitHub Pages (.github/workflows/deploy.yml, main push 시)

## 구조
- `src/store.ts` — localStorage 스토어 (useSyncExternalStore)
- `src/lib/search.ts` — 알라딘 JSONP + 카카오 REST 검색 (키는 설정 화면에서 사용자 입력, 또는 Supabase 프록시)
- `src/lib/ocr.ts` — Tesseract.js CDN 지연 로드 (문장수집 베타)
- `src/lib/sharecard.ts` — 완독 카드 canvas PNG
- `src/lib/supabase.ts` — Supabase 클라이언트 (`hasSupabase` 플래그로 모임 기능 게이팅)
- `src/lib/group.ts` — 모임(방코드·피드·함께읽기) API. Supabase 미설정 시 비활성
- `src/screens/` — Home(스트릭·목표·읽는중) / Library / Search / BookDetail / Stats(뱃지·캘린더·도넛·결산) / Group(모임) / Settings

## 독립 모듈 — 또박또박 (감각 친화 AAC)
- 독서앱과 별개인 보완대체의사소통(AAC) 도구. 진입점 `aac.html`(멀티 페이지, vite `rollupOptions.input`) → 배포 시 `/aac.html`
- `src/aac/` — main / App(카드 그리드·문장 스트립·편집) / Settings(감각 조절 시트) / data(기본 어휘) / store(localStorage `bookbloom_aac_v1`) / speech(Web Speech API TTS) / eleven(ElevenLabs TTS + IndexedDB 캐시) / aac.css
- 설계: 저채도 팔레트·큰 탭 영역·움직임 최소화·번쩍임 없음. 테마/모션/색상은 `<html data-aac-*>` 속성으로 전환
- 음성 2종: ① 기기 내장 TTS(기본, 키 불필요) ② **일레븐랩스**(고품질·안정) — 키는 설정 화면에서 사용자 입력(이 기기에만 저장, 코드에 없음). 생성 음성은 IndexedDB(`aac_tts`) 캐시 → 반복 재생 시 즉시·오프라인·동일 목소리. 실패 시 기기 음성으로 자동 대체. "모든 카드 미리 만들기"로 사전 캐시 가능

## 디자인 (페이퍼 에디션 — v0.19)
- 팔레트: 웜 잉크 `#211d16` · 종이 `#faf6ec` · 카드 `#fffdf7` · 라인 `#eae2d3` · 트랙 `#efe8da`
- **그린 `#4e9c6f`이 유일한 액센트** (구 코랄 `#F2845C`은 잉크로 통일, 미니멀 방향으로 폐기)
- 디스플레이=마루부리(`MaruBuriDisplay`, 세리프) · 본문=Pretendard · `word-break: keep-all`
- 공유 카드(`sharecard`·카드 스타일 forest/light/mesh)는 **별도 팔레트 유지** (딥그린·메시 그라데이션 허용)
- 존댓말·안심 톤 ("~해 보세요", "괜찮아요"), 공포·재촉 문구 금지

## 미검증 / 게이팅 (외부 키·설정 필요)
- 알라딘/카카오 실검색 — 사용자 API 키 등록(설정 화면) 또는 Supabase 프록시 후 테스트 필요
- 모임(Phase 3 소셜) — **코드는 완성**, `VITE_SUPABASE_URL`·`VITE_SUPABASE_ANON_KEY` 설정 시 활성화. 미설정이면 "곧 열려요" 안내
- OCR 실사진 인식률
