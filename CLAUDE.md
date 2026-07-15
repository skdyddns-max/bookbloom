# 결 (Gyeol) — 독서 기록 웹앱

성인 독서가를 위한 독서관리 PWA. **"읽는 결이 쌓이는 곳"** — 경쟁이 아니라 꾸준함.
구 이름은 **북블룸(BookBloom)** — v0.23에서 **결**로 리브랜드(코드·저장키의 `bookbloom` 접두사는 그대로 유지, 아래 참고).

기획서: [docs/기획서.md](docs/기획서.md) · 브랜드: [docs/brand.md](docs/brand.md)

## 스택·실행
- **Vite 5 + React 18 + TypeScript** (SPA). 상태·데이터는 전부 브라우저 `localStorage` — **서버·백엔드 없음**(Supabase는 선택적 게이팅 기능만)
- 개발: `npm run dev` → http://localhost:8033
- 빌드: `npm run build` (= `tsc -b && vite build`, 산출물 `dist/`) · 미리보기: `npm run preview`
- 배포: **main push 시** GitHub Actions → GitHub Pages (`.github/workflows/deploy.yml`). `base: './'`(vite.config)로 상대경로 배포
- **테스트 러너·린터·포매터 없음.** 검증은 `npm run build`(타입체크 포함)로. 새 의존성은 최소화(현재 런타임 의존성은 React + `@supabase/supabase-js`뿐)

## 데이터 모델 (`src/types.ts`)
`AppData = { version:1, settings, books[], logs[], notes[] }` 한 덩어리로 저장.
- **Book** — `status: 'want'|'reading'|'done'`, `rating`(0~5, 0.5단위), `totalPages`, `category`, `oneLine`, 날짜들. `id`는 isbn13 또는 `manual-uuid`
- **ProgressLog** — 그날 도달한 **누적 쪽수**(page). "그날 읽은 쪽"은 `pagesReadByLog`가 이전 도달점과의 차로 계산
- **Note** — `type: 'note'|'quote'`(생각 / 밑줄문장)
- **Settings** — `yearlyGoal`, `aladinKey`, `kakaoKey`(사용자 직접 입력 키)

## 구조

### 상태·스토어
- `src/store.ts` — `useSyncExternalStore` 기반 단일 스토어. `KEY='bookbloom_v1'`. `store.*` 메서드로만 변경, `useAppData()`로 구독
  - `completeBook()`은 완독 시 `onCelebrate` 이벤트를 발화 → App이 `Celebration` 오버레이 표시
  - `applyRemote()`/`isApplyingRemote()`/`subscribe()`는 클라우드 동기화 전용(푸시 에코 방지)
- `src/utils.ts` — 날짜(`todayStr`,`addDays`), 스트릭(`calcStreak`,`maxStreak`), `pagesReadByLog`, `uid` 등 순수 함수

### 화면 (`src/screens/`) — 탭 5개 + 서브뷰
탭: **홈 / 서재(Library) / 모임(Group) / 기록(Stats) / 설정(Settings)**. 라우팅은 `App.tsx`의 `Screen` 유니온 상태(라우터 라이브러리 없음)
- `Home` — 스트릭·이번 주 스트립·연간 목표·읽는 중·이달의 챌린지 노출
- `Library` — 서재(상태별)
- `Search` — 책 검색·추가 (서브뷰)
- `BookDetail` — 진도 기록·별점·노트/밑줄·독후 질문·공유카드·모임 공유 (서브뷰)
- `Stats`(=기록 탭) — 뱃지·캘린더·도넛·바차트·연간 결산 카드
- `Group` — 모임(방코드·피드·함께읽기). Supabase 미설정 시 비활성 안내
- `Settings` — 목표·API 키·동기화 코드·주간알림·내보내기/가져오기·도움말 진입
- `Welcome` — 최초 실행 온보딩(`localStorage 'bookbloom_onboarded'`로 1회)
- `Help` — 앱 사용법 도움말 (서브뷰)
- `Celebration` — 완독 축하 오버레이 (이벤트 구동)
- `Challenges` — 결 시즌 챌린지 상세

### 공용 컴포넌트 (`src/components.tsx`)
`BookCover · StarRating · ProgressBar · Donut · MonthCalendar · BarChart` + `CATEGORIES` 상수

### 도메인 로직 (`src/lib/`) — 대부분 순수 함수, 화면과 분리
- `search.ts` — 알라딘 + 카카오 도서 검색. 알라딘은 CORS 미지원이라 **Supabase Edge Function `bb-aladin` 프록시** 경유(TTB 키는 서버 secret). 프록시 없으면 사용자 키 폴백
- `questions.ts` — 카테고리→**6개 장르버킷**(`genreBucket`) 매핑 + 장르×진도별 "읽는 중/독후" 생각거리. `genreBucket`은 페르소나·챌린지에서도 재사용
- `badges.ts` — 서재·기록·노트에서 **뱃지 달성 계산**(순수, 저장 안 함)
- `persona.ts` — **리딩 페르소나**: 실제 기록에서 아키타입·성향태그·장르분포 도출(활동 3권↑부터 `ready`)
- `challenges.ts` — **결 시즌 챌린지**: 정의는 코드에 월별 자동 편성(에디토리얼), 진도는 사용자 기록에서 산출, 완주 뱃지는 localStorage에 영구 기록, 참여자 수는 Supabase 익명 집계
- `weekly.ts` — **주간 되돌아보기**(지난 일~토 요약) + 선택적 로컬 알림(Notification API)
- `cloudsync.ts` — **동기화 코드**로 무가입 크로스기기 동기화(Supabase RPC `bb_sync_*`). id 합집합 병합(로컬 우선), 변경 시 디바운스 푸시
- `ocr.ts` — Tesseract.js를 CDN에서 지연 로드해 사진 속 문장 추출(**베타**)
- `sharecard.ts` — 완독/문장/연간결산 canvas PNG. 스타일 forest/light/mesh
- `supabase.ts` — 클라이언트. `hasSupabase` 플래그로 모임·챌린지집계·동기화 게이팅
- `group.ts` — 모임 API(방·피드·좋아요·댓글·함께읽기 진도). 모두 token 검증 RPC 경유

### 기타
- `src/config.ts` — `OPEN_CHAT_URL`(카카오 오픈채팅), `aladinBookUrl`(제휴 구매링크 — 프록시가 TTB 키로 attribution)
- `public/` — PWA(`manifest.webmanifest`, `sw.js` network-first 셸 캐시, 아이콘)
- `supabase/` — `schema.sql`(모임 v1) + `schema_v2.sql`(함께읽기 v2) + `functions/bb-aladin`(알라딘/구매 프록시). 보안모델: 읽기는 공개 select, 쓰기는 token 검증 RPC만

## 디자인 (웜 페이퍼 에디션 — `src/styles.css` `:root`)
- 팔레트: 웜 잉크 `--ink #211d16` · 종이 `--paper #faf5ea` · 카드 `--card #fffdf6` · 라인 `#ece4d4` · 트랙 `#efe8da`
- 액센트 **2종**: 그린 `--green #4e9c6f`(습관·진행) + **코랄 `--coral #e07a55`(딜라이트·스트릭·CTA 강조, 화면당 1곳)**. 별점 전용 앰버 `--star #c39b52`
  - *주의: 초기 페이퍼 에디션(v0.19)은 코랄을 폐기했으나, v0.22 "웜+개성 패스"에서 코랄이 웜 액센트로 복귀했다.*
- 디스플레이=마루부리(`--serif`, `MaruBuriDisplay` 세리프, CDN) · 본문=Pretendard · 전역 `word-break: keep-all`
- 공유 카드(`sharecard`, forest/light/mesh)는 **별도 팔레트 유지**(딥그린 `#6DBE8A`·코랄 `#F2845C`·메시 그라데이션 허용)
- **톤**: 존댓말·안심("~해 보세요", "괜찮아요"). 재촉·죄책감·공포·숫자 압박 금지. 쉬어도 "다시 이어져요"로 맞이

## 규칙·주의사항 (AI 어시스턴트용)
- **저장 키의 `bookbloom` 접두사는 절대 바꾸지 말 것** — 리브랜드(결) 이후에도 `bookbloom_v1`, `bookbloom_sync`, `bookbloom_onboarded`, `bookbloom_challenges`, `bookbloom_challenge_done`, `bookbloom_pid`, `bookbloom_weekreview_*`, sw 캐시 `bookbloom-v1`, Supabase `bb_` 접두사 모두 유지. 이름 변경 시 기존 사용자 데이터가 유실됨
- 사용자에게 보이는 **텍스트는 한국어**. 새 문구는 위 브랜드 톤을 따를 것
- 데이터 변경은 반드시 `store.*` 경유(직접 localStorage 쓰기 금지). 파생값은 `lib/`·`utils`의 순수함수로 계산해 저장하지 말 것
- 커밋 컨벤션: `vN.NN: 한 줄 요약`(기능) 또는 `feat:`/`docs:`. 현재 최신 = **v0.31**. 배포는 main에서만
- 새 화면은 `App.tsx`의 `Screen` 유니온·탭 배열에 등록

## 미검증 / 외부 설정 게이팅
- **알라딘/카카오 실검색** — Supabase 프록시(`bb-aladin`) 또는 사용자 API 키(설정 화면) 필요. 키 없으면 검색 비활성
- **모임·챌린지 집계·클라우드 동기화** — `VITE_SUPABASE_URL`·`VITE_SUPABASE_ANON_KEY`(빌드 env, Actions secret) 설정 시 활성. 미설정이면 안내만 노출하고 앱은 정상 동작
- **OCR** 실사진 인식률(베타)
