# 북블룸 (BookBloom)

성인 독서관리 웹앱 (PWA). 기획서: [docs/기획서.md](docs/기획서.md)

## 스택·실행
- Vite + React + TS, 데이터는 localStorage(`bookbloom_v1`) — 서버 없음
- 개발: `npm run dev` → http://localhost:8033
- 빌드: `npm run build` (tsc -b 포함, dist/)
- 배포: GitHub Actions → GitHub Pages (.github/workflows/deploy.yml, main push 시)

## 구조
- `src/store.ts` — localStorage 스토어 (useSyncExternalStore)
- `src/lib/search.ts` — 알라딘 JSONP + 카카오 REST 검색 (키는 설정 화면에서 사용자 입력)
- `src/lib/ocr.ts` — Tesseract.js CDN 지연 로드 (문장수집 베타)
- `src/lib/sharecard.ts` — 완독 카드 canvas PNG
- `src/screens/` — Home(스트릭·목표·읽는중) / Library / Search / BookDetail / Stats(캘린더·도넛) / Settings

## 디자인 (톡블룸 브랜드 준수)
- 소프트그린 `#6DBE8A` · 크림 `#FAF7F0` · 다크그레이 `#3A3A3A` · Pretendard
- **코랄 `#F2845C`은 화면당 딱 1곳** (홈=스트릭 숫자, 상세=별점/완독카드 버튼)
- 존댓말·안심 톤 ("~해 보세요", "괜찮아요"), 공포·재촉 문구 금지

## 미검증 (실키 필요)
- 알라딘/카카오 실검색 — 사용자 API 키 등록 후 테스트 필요
- OCR 실사진 인식률
