# FitCheck — Monorepo

피트니스 입문자와 골목 헬스장(소상공인)을 잇는 스마트 피트니스 플랫폼입니다.

## 현재 진행도 (2026-07-30)

회원 경로(MVP)는 **백엔드 ↔ 프론트 연동 완료**, **Vercel·Render 프로덕션 배포**까지 동작합니다.  
트레이너 모드는 **로컬 Mock** 단계입니다.

| 영역 | 상태 | 요약 |
|------|------|------|
| **Backend API** | ✅ MVP | 강좌·헬스장·상담(PII)·식단(AI)·매칭 점수 — [backend/docs/README.md](../backend/docs/README.md) |
| **Frontend 회원 `/user`** | ✅ | Google + 이메일 이중 로그인, 비밀번호 재설정·계정 설정, 홈·강좌·지도·상담·식단 API 연동 — [frontend-web/README.md](../frontend-web/README.md) |
| **Frontend 트레이너 `/trainer`** | 🟡 Mock | localStorage 기반, 백엔드 미연동 |
| **Mobile App** | ✅ WebView | Safe Area 연동 + frontend-web 래퍼 — [mobile-app/README.md](../mobile-app/README.md) |

**범례:** ✅ 동작 · 🟡 부분/Mock · ❌ 미구현

### 배포

| 서비스 | 플랫폼 | URL |
|--------|--------|-----|
| **웹 (frontend-web)** | Vercel | https://hub-tan-pi.vercel.app |
| **API (backend)** | Render | https://fitcheck-server-wvj4.onrender.com |

---

## 프로젝트 구조

```
fitcheck-project/
├── backend/         # Express API + Supabase
├── frontend-web/    # Vite + React (회원 / 트레이너)
└── mobile-app/      # Expo WebView (frontend-web 로드)
```

| 폴더 | 역할 | 문서 |
|------|------|------|
| [`backend/`](./backend/) | API 서버, DB 마이그레이션, PII 암호화 | [backend/README.md](./backend/README.md) |
| [`frontend-web/`](./frontend-web/) | 핵심 웹 UI | [frontend-web/README.md](./frontend-web/README.md) |
| [`mobile-app/`](./mobile-app/) | 하이브리드 앱 래퍼 | [mobile-app/README.md](./mobile-app/README.md) |

### frontend-web 내부

- `src/pages/user/` — 회원 모드 (모바일 비율, Safe Area 대응)
- `src/pages/auth/` — 로그인 · 회원가입 · 비밀번호 찾기/재설정 · OAuth
- `src/pages/trainer/` — 트레이너 대시보드
- `src/features/` — 강좌 / 식단 / 지도 / 상담 등
- `src/services/` — API 클라이언트 (`api.ts`, `gymsApi.ts`, `consultRequestsApi.ts`)

## 아키텍처 & 데이터 흐름

화면(React), Express API, Supabase DB·Storage, 외부 API(Gemini·Naver Map)의 연결 구조입니다.

### 전체 구조

```mermaid
flowchart TB
  subgraph Client["화면 (Client)"]
    WEB["frontend-web<br/>React + Vite<br/>/user · /trainer"]
    MOBILE["mobile-app<br/>Expo WebView"]
  end

  subgraph Server["서버 (Backend)"]
    API["Express API<br/>Render · localhost:5001<br/>JWT 검증 · PII 암호화"]
  end

  subgraph Supabase["Supabase"]
    AUTH["Auth<br/>JWT 발급"]
    DB[(Postgres<br/>profiles · meal_logs<br/>gyms · consult_requests …)]
    STORAGE[(Storage<br/>meal-images)]
  end

  subgraph External["외부 API"]
    GEMINI["Gemini API<br/>식단 Vision 분석"]
    NAVER["Naver Map<br/>지도 · GPS"]
  end

  MOBILE -->|WebView 로드| WEB
  WEB -->|"/api/*" HTTPS| API
  WEB -->|로그인| AUTH
  WEB -->|지도 렌더| NAVER

  API -->|SELECT / INSERT / UPDATE| DB
  API -->|JWT 검증| AUTH
  API -->|사진 업로드| STORAGE
  API -->|백그라운드 AI| GEMINI
```

| 구간 | 설명 |
|------|------|
| Client → Express | Vite dev는 `/api`를 `localhost:5001`로 프록시 |
| Express → Postgres | 강좌·헬스장·식단·상담 등 CRUD |
| Express → Gemini | 식단 사진 분석 (저장 후 백그라운드) |
| Express → Storage | 식단 사진 업로드 → public URL → `meal_logs.image_url` |

### 식단 AI (비동기 저장)

사용자는 **1~2초 안에 저장 완료**를 체감하고, AI 결과는 타임라인에서 **2초 폴링**으로 갱신됩니다.

```mermaid
sequenceDiagram
  actor U as 사용자
  participant F as frontend-web
  participant E as Express
  participant S as Supabase
  participant G as Gemini

  U->>F: 식단 사진 선택
  F->>E: POST /uploads/meals
  E->>S: Storage 업로드
  S-->>E: image URL
  E-->>F: public URL
  F->>E: POST /meals
  E->>S: meal_logs INSERT
  E-->>F: 201 (aiAnalysisPending: true)

  Note over E,G: 응답 후 백그라운드 분석
  E->>G: Vision + 프롬프트
  G-->>E: 탄단지 · 피드백
  E->>S: meal_logs UPDATE

  loop 2초마다 (최대 90초)
    F->>E: GET /meals
    E->>S: SELECT
    E-->>F: 분석 완료 데이터
  end
```

### 상담 PII (AES-256-GCM)

상담 신청의 이름·연락처·메모만 **앱 레벨 필드 암호화**합니다. 식단·프로필 등은 JWT 인증 + DB 접근 통제로 보호합니다.

```mermaid
flowchart LR
  C["Client<br/>상담 신청 폼"] -->|HTTPS JSON| E["Express<br/>fieldEncryption.ts"]
  E -->|encryptField<br/>name · phone · memo …| DB[("Supabase<br/>consult_requests<br/>(ciphertext)")]
  E -->|decryptField| C
```

→ 상세: [backend/README.md — 상담 신청 개인정보 암호화](./backend/README.md#상담-신청-개인정보-암호화)

### 헬스장 매칭

PT 강좌 시청 기록(`course_views`)과 GPS 위치를 Express에서 **규칙 기반 점수**로 계산합니다. (Gemini 미사용)

```mermaid
flowchart LR
  F["frontend-web<br/>지도 · 홈"] -->|GET /gyms/recommended<br/>lat · lng| E["Express<br/>gymRecommendation"]
  E -->|course_views<br/>courses · trainers| DB[(Postgres)]
  E -->|매칭 점수 · 이유| F
  F -->|POST /courses/:id/watch| E
  E -->|시청 기록 저장| DB
```

## 빠른 시작

### 1. Backend

```bash
cd fitcheck-project/backend
npm install
cp .env.example .env   # Supabase, 암호화 키 등 설정
npm run db:migrate     # 최초 1회
npm run dev
```

→ http://localhost:5001

### 2. Frontend Web

```bash
cd fitcheck-project/frontend-web
npm install
cp .env.example .env.local   # 필요 시 (Naver Map Client ID 등)
npm run dev
```

→ http://localhost:5173  
Vite dev 서버는 `/api`를 `localhost:5001`로 프록시합니다.

- 회원: `/user`
- 트레이너: `/trainer`

### 3. Mobile App (선택)

```bash
cd fitcheck-project/mobile-app
npm install
npm start
```

`EXPO_PUBLIC_WEB_APP_URL`을 frontend-web 주소로 맞춥니다 (실기기는 LAN IP, 배포본은 Vercel URL).

### 4. 프로덕션 (배포)

| 서비스 | 플랫폼 | 비고 |
|--------|--------|------|
| frontend-web | **Vercel** | SPA 라우팅 — `frontend-web/vercel.json` |
| backend | **Render** | https://fitcheck-server-wvj4.onrender.com |

Vercel 환경 변수: `VITE_API_BASE_URL=https://fitcheck-server-wvj4.onrender.com`, `VITE_SUPABASE_*`, `VITE_SITE_URL`, `VITE_NAVER_MAP_CLIENT_ID`

Supabase Redirect URLs: `/auth/callback`, `/reset-password` (로컬·배포 도메인 모두 등록)

## 요구 사항

- Node.js 18+
- Supabase 프로젝트 (backend `.env`)
- mobile-app: Expo Go 또는 시뮬레이터

## 보안

상담 신청 개인정보(이름·연락처·메모 등)는 백엔드에서 **AES-256-GCM**으로 암호화해 Supabase에 저장합니다.

→ 상세: [backend/README.md — 상담 신청 개인정보 암호화](./backend/README.md#상담-신청-개인정보-암호화)
