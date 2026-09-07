# FitCheck API 명세서 (v1 · MVP)

> 기준 ERD: `profiles`, `gyms`, `trainers`, `consult_requests`, `meal_logs`, `courses`  
> Base URL: `http://localhost:5000/api/v1`  
> Content-Type: `application/json`

---

## 0. 공통 규칙

### 0.1 인증
| 구분 | 헤더 | 설명 |
|------|------|------|
| 공개 | 없음 | 헬스장/강좌 조회, 상담 신청(비로그인 허용 시) |
| 회원 | `Authorization: Bearer <access_token>` | Supabase Auth JWT |
| 관리/트레이너 | 동일 + `profiles.role` 검증 | 상담 상태 변경 등 |

### 0.2 공통 응답 포맷

**성공**
```json
{
  "success": true,
  "data": {}
}
```

**목록**
```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 20
  }
}
```

**실패**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "필수 값이 누락되었습니다."
  }
}
```

### 0.3 HTTP 상태 코드
| 코드 | 의미 |
|------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 500 | 서버 오류 |

### 0.4 에러 코드
| code | 설명 |
|------|------|
| `VALIDATION_ERROR` | 요청 바디/쿼리 검증 실패 |
| `UNAUTHORIZED` | 토큰 없음/만료 |
| `FORBIDDEN` | 역할/소유권 불일치 |
| `NOT_FOUND` | 대상 리소스 없음 |
| `CONFLICT` | 중복/상태 충돌 |

---

## 1. Health

### `GET /api/test`
서버 연결 확인 (기존 샘플 유지)

**Response `200`**
```json
{
  "message": "성공적으로 서버와 연결되었습니다.",
  "status": "success"
}
```

---

## 2. Profiles (계정)

> 테이블: `profiles`  
> Auth 회원가입 직후 프로필 row를 생성한다고 가정

### 2.1 `GET /api/v1/me`
내 프로필 조회

- Auth: 필요

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "role": "user",
    "name": "홍길동",
    "phone": "010-1234-5678",
    "created_at": "2026-07-16T04:00:00.000Z"
  }
}
```

### 2.2 `PATCH /api/v1/me`
내 프로필 수정

- Auth: 필요

**Request**
```json
{
  "name": "홍길동",
  "phone": "010-1234-5678"
}
```

**Response `200`**: 수정된 profile 객체

### 2.3 `POST /api/v1/profiles` (선택)
회원가입 직후 프로필 초기화 (Auth webhook / 서버에서 처리해도 됨)

**Request**
```json
{
  "id": "auth-user-uuid",
  "role": "user",
  "name": "홍길동",
  "phone": "010-1234-5678"
}
```

**Response `201`**: 생성된 profile

---

## 3. Gyms (헬스장 / 지도 매칭)

> 테이블: `gyms`

### 3.1 `GET /api/v1/gyms`
헬스장 목록 / 주변 검색

- Auth: 불필요
- Query

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `lat` | number | 조건부 | 현재 위도 (반경 검색 시) |
| `lng` | number | 조건부 | 현재 경도 (반경 검색 시) |
| `radiusKm` | number | N | 반경 km (기본 `3`) |
| `type` | string | N | `골목 헬스장` \| `1인 PT숍` \| `개인 트레이너` |
| `q` | string | N | 이름/주소 검색어 |
| `page` | number | N | 기본 `1` |
| `limit` | number | N | 기본 `20`, 최대 `50` |

> `lat`+`lng`가 있으면 반경 필터 + `distanceKm` 계산  
> 없으면 `is_active=true` 전체(또는 페이징) 목록

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "골목핏 헬스",
      "type": "골목 헬스장",
      "address": "부산 부산진구 부전동",
      "lat": 35.1586,
      "lng": 129.0568,
      "hours": "평일 06:00–23:00 · 주말 08:00–21:00",
      "price": "월 회원 59,000원부터",
      "equipment": ["스미스머신", "케이블"],
      "amenities": ["샤워실", "락커"],
      "photos": ["https://..."],
      "rating": 4.8,
      "is_active": true,
      "distanceKm": 0.4,
      "created_at": "2026-07-16T04:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20 }
}
```

### 3.2 `GET /api/v1/gyms/:id`
헬스장 상세 (+ 소속 트레이너 포함)

- Auth: 불필요

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "골목핏 헬스",
    "type": "골목 헬스장",
    "address": "부산 부산진구 부전동",
    "lat": 35.1586,
    "lng": 129.0568,
    "hours": "평일 06:00–23:00",
    "price": "월 회원 59,000원부터",
    "equipment": ["스미스머신"],
    "amenities": ["샤워실"],
    "photos": ["https://..."],
    "rating": 4.8,
    "is_active": true,
    "trainers": [
      {
        "id": "uuid",
        "gym_id": "uuid",
        "name": "김서연",
        "specialty": "입문 · 자세교정",
        "bio": "기본기부터 차근히 알려드립니다.",
        "photo_url": "https://...",
        "is_active": true
      }
    ]
  }
}
```

**Response `404`**: gym 없음 / 비활성

---

## 4. Trainers (트레이너)

> 테이블: `trainers`

### 4.1 `GET /api/v1/gyms/:gymId/trainers`
특정 헬스장 소속 트레이너 목록

- Auth: 불필요

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "gym_id": "uuid",
      "profile_id": null,
      "name": "김서연",
      "specialty": "입문 · 자세교정",
      "bio": "기본기부터 차근히 알려드립니다.",
      "photo_url": "https://...",
      "is_active": true,
      "created_at": "2026-07-16T04:00:00.000Z"
    }
  ]
}
```

### 4.2 `GET /api/v1/trainers/:id`
트레이너 단건 조회

- Auth: 불필요

**Response `200`**: trainer 객체 (+ 필요 시 `gym` 요약 포함)

---

## 5. Consult Requests (상담 신청)

> 테이블: `consult_requests`  
> FE `ConsultRequestSheet` payload와 1:1 매핑

### 5.1 `POST /api/v1/consult-requests`
상담 신청 생성

- Auth: 선택 (로그인 시 `user_id` 자동 세팅)

**Request**
```json
{
  "gymId": "uuid",
  "trainerId": "uuid | null",
  "name": "홍길동",
  "phone": "010-1234-5678",
  "preferredDate": "2026-07-20",
  "preferredTime": "18:00",
  "topic": "다이어트",
  "topicDetail": "",
  "memo": "입문자입니다."
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| gymId | uuid | Y | 대상 헬스장 |
| trainerId | uuid \| null | N | 지정 트레이너 |
| name | string | Y | 신청자 이름 |
| phone | string | Y | 연락처 |
| preferredDate | date `YYYY-MM-DD` | Y | 희망 날짜 |
| preferredTime | time `HH:mm` | Y | 희망 시간 |
| topic | string | Y | `벌크업` \| `다이어트` \| `자세 교정` \| `입문` \| `기타` |
| topicDetail | string | 조건부 | topic=`기타`일 때 필수 |
| memo | string | N | 메모 |

**Response `201`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": null,
    "gym_id": "uuid",
    "trainer_id": null,
    "name": "홍길동",
    "phone": "010-1234-5678",
    "preferred_date": "2026-07-20",
    "preferred_time": "18:00:00",
    "topic": "다이어트",
    "topic_detail": "",
    "memo": "입문자입니다.",
    "status": "pending",
    "created_at": "2026-07-16T04:00:00.000Z"
  }
}
```

### 5.2 `GET /api/v1/consult-requests/me`
내 상담 신청 목록

- Auth: 필요

**Query**: `status?`, `page?`, `limit?`

**Response `200`**: consult_requests[]

### 5.3 `GET /api/v1/consult-requests/:id`
상담 신청 상세

- Auth: 필요 (본인 또는 해당 gym/trainer 권한)

### 5.4 `PATCH /api/v1/consult-requests/:id/status`
상담 상태 변경 (트레이너/사장님)

- Auth: 필요 (`trainer` \| `gym_owner`)

**Request**
```json
{
  "status": "accepted"
}
```

허용 값: `pending` | `accepted` | `rejected` | `done`

**Response `200`**: 갱신된 consult_request

---

## 6. Meal Logs (식단)

> 테이블: `meal_logs`

### 6.1 `GET /api/v1/meals`
내 식단 목록

- Auth: 필요
- Query

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `date` | date | N | 특정 날짜 |
| `from` | date | N | 시작일 |
| `to` | date | N | 종료일 |
| `page` | number | N | |
| `limit` | number | N | |

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "date": "2026-07-16",
      "meal_type": "점심",
      "time": "12:30",
      "memo": "닭가슴살 샐러드",
      "image_url": null,
      "macros": { "carb": 40, "protein": 35, "fat": 25, "kcal": 520 },
      "ai_feedback": "단백질 비중은 좋아요. 탄수화물을 조금 더 채워보세요.",
      "created_at": "2026-07-16T03:30:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20 }
}
```

### 6.2 `POST /api/v1/meals`
식단 기록 생성

- Auth: 필요

**Request**
```json
{
  "date": "2026-07-16",
  "mealType": "점심",
  "time": "12:30",
  "memo": "닭가슴살 샐러드",
  "imageUrl": null,
  "macros": {
    "carb": 40,
    "protein": 35,
    "fat": 25,
    "kcal": 520
  },
  "aiFeedback": "단백질 비중은 좋아요."
}
```

**Response `201`**: 생성된 meal_log

### 6.3 `GET /api/v1/meals/:id`
식단 단건

- Auth: 필요 (본인만)

### 6.4 `PATCH /api/v1/meals/:id`
식단 수정

- Auth: 필요 (본인만)

**Request** (부분 수정 가능)
```json
{
  "memo": "수정된 메모",
  "aiFeedback": "업데이트된 피드백"
}
```

### 6.5 `DELETE /api/v1/meals/:id`
식단 삭제

- Auth: 필요 (본인만)
- Response `200`: `{ "success": true, "data": { "id": "uuid" } }`

---

## 7. Courses (강좌)

> 테이블: `courses`

### 7.1 `GET /api/v1/courses`
강좌 목록

- Auth: 불필요
- Query

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `bodyPart` | string | N | 가슴/등/하체/어깨/코어 |
| `goal` | string | N | 다이어트/벌크업/근력/입문 |
| `q` | string | N | 제목 검색 |
| `page` | number | N | |
| `limit` | number | N | |

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "초보 가슴 루틴 — 덤벨 프레스 마스터",
      "body_part": "가슴",
      "goal": "입문",
      "duration_min": 18,
      "level": "초급",
      "trainer_name": "박코치",
      "video_url": "https://...",
      "description": "입문자가 혼자 따라가기 쉬운 가슴 가이드",
      "is_active": true,
      "created_at": "2026-07-16T04:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20 }
}
```

### 7.2 `GET /api/v1/courses/:id`
강좌 상세

- Auth: 불필요
- Response `200`: course 객체  
- Response `404`: 없음/비활성

---

## 8. 엔드포인트 요약표

| Method | Path | Auth | 설명 | 관련 테이블 |
|--------|------|------|------|-------------|
| GET | `/api/test` | X | 서버 헬스체크 | - |
| GET | `/api/v1/me` | O | 내 프로필 | profiles |
| PATCH | `/api/v1/me` | O | 프로필 수정 | profiles |
| GET | `/api/v1/gyms` | X | 목록/주변 검색 | gyms |
| GET | `/api/v1/gyms/:id` | X | 상세(+트레이너) | gyms, trainers |
| GET | `/api/v1/gyms/:gymId/trainers` | X | 소속 트레이너 | trainers |
| GET | `/api/v1/trainers/:id` | X | 트레이너 상세 | trainers |
| POST | `/api/v1/consult-requests` | 선택 | 상담 신청 | consult_requests |
| GET | `/api/v1/consult-requests/me` | O | 내 신청 목록 | consult_requests |
| GET | `/api/v1/consult-requests/:id` | O | 신청 상세 | consult_requests |
| PATCH | `/api/v1/consult-requests/:id/status` | O | 상태 변경 | consult_requests |
| GET | `/api/v1/meals` | O | 내 식단 목록 | meal_logs |
| POST | `/api/v1/meals` | O | 식단 생성 | meal_logs |
| GET | `/api/v1/meals/:id` | O | 식단 상세 | meal_logs |
| PATCH | `/api/v1/meals/:id` | O | 식단 수정 | meal_logs |
| DELETE | `/api/v1/meals/:id` | O | 식단 삭제 | meal_logs |
| GET | `/api/v1/courses` | X | 강좌 목록 | courses |
| GET | `/api/v1/courses/:id` | X | 강좌 상세 | courses |

---

## 9. FE 연동 우선순위 (구현 순서 제안)

1. **P0** `GET /gyms`, `GET /gyms/:id` — 지도/상세 목업 교체  
2. **P0** `POST /consult-requests` — 상담 신청 `console.log` 교체  
3. **P1** `GET/POST /meals` — 식단 타임라인  
4. **P1** `GET /courses`, `GET /courses/:id` — 강좌 라이브러리  
5. **P2** `GET/PATCH /me`, 상담 status API — Auth·트레이너 대시보드

---

## 10. 비고

- 필드명은 API JSON은 **camelCase**, DB 컬럼은 **snake_case** 를 권장 (서버에서 변환).
- 이미지 업로드는 추후 `POST /api/v1/uploads` + Supabase Storage로 분리.
- 주변 검색은 1차: lat/lng bounding box + 거리 정렬 → 2차: PostGIS.
- 본 문서는 MVP 범위이며, 운동기록/회원-트레이너 연결은 v2에서 추가.
