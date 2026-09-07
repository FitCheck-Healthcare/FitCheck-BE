# FitCheck Backend Docs

백엔드 API 명세·진행도 문서입니다.

| 문서 | 설명 |
|------|------|
| [API.md](./API.md) | REST API v1 명세 (MVP) |
| [../README.md](../README.md) | 환경 변수, PII 암호화, 헬스장 매칭 점수 |

## 현재 진행도 (2026-07-30)

### API · 도메인

| 기능 | 상태 | 비고 |
|------|------|------|
| Health / 테스트 | ✅ | `GET /api/test` |
| 프로필 (`/me`) | ✅ | JWT 검증, 최초 접근 시 auto-create |
| 강좌 (`/courses`) | ✅ | 목록·상세, seed 데이터 |
| 강좌 시청 기록 | ✅ | `POST /courses/:id/watch`, `GET /me/course-activity` |
| 헬스장 (`/gyms`) | ✅ | 목록·상세·트레이너, Naver 지역 검색 sync |
| 헬스장 추천 | ✅ | `GET /gyms/recommended` — 규칙 기반 매칭 점수 |
| 상담 신청 | ✅ | `POST/GET /consult-requests`, AES-256-GCM PII |
| 식단 | ✅ | CRUD + Storage 업로드 + Gemini Vision 비동기 분석 |
| Supabase Auth JWT | ✅ | `requireAuth`, `optionalAuth` — Google OAuth·이메일/비밀번호 공통 |
| DB 마이그레이션 | ✅ | 10개 SQL (schema, seed, PII, course_views, meal storage) |
| 트레이너·관리 API | ❌ | 상담 상태 변경, 역할 기반 인박스 등 미구현 |

> Auth UI(비밀번호 재설정·계정 설정)는 **Supabase Auth 클라이언트**에서 처리하며, API는 JWT만 검증합니다.

**범례:** ✅ 동작 · 🟡 부분 · ❌ 미구현

### 다음 단계 (예상)

1. 트레이너용 상담 인박스·상태 변경 API (`profiles.role` 검증)

---

## 배포

| 환경 | 플랫폼 | URL |
|------|--------|-----|
| **프로덕션 API** | Render (Web Service) | https://fitcheck-server-wvj4.onrender.com/api/v1 |
| **로컬 개발** | — | `http://localhost:5001/api/v1` |

프론트엔드(Vercel)는 `VITE_API_BASE_URL=https://fitcheck-server-wvj4.onrender.com` 로 Render API를 호출합니다.
