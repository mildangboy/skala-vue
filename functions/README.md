# 레이스 전날 날씨 알림 (Google Cloud)

관전 플랜에서 알림을 켜둔 사람에게, **레이스 전날 서킷 날씨를 메일로** 보냅니다.

```
Cloud Scheduler (매일 09:00 KST)
        │
        ▼
Cloud Function  ──▶ Firestore    (알림 켠 플랜 조회)
                ──▶ OpenWeather  (서킷 좌표 날씨)
                ──▶ Gmail API    (내 계정에서 발송)
```

메일은 HTTPS(443)로 나가므로 Cloud Functions의 SMTP 제약을 받지 않습니다.

---

## 현재 상태 (2026-08-04 기준)

이 저장소는 아래 프로젝트에 이미 연결돼 있습니다.

| 항목 | 값 | 상태 |
| --- | --- | --- |
| 프로젝트 ID | `numeric-melody-504500-q8` | 완료 |
| 요금제 | Blaze (무료 체험판 크레딧 사용 중) | 완료 |
| Firestore | 기본 모드 · `asia-northeast3` | 완료 |
| 보안 규칙 | `firestore.rules` 게시됨 | 완료 |
| 구글 로그인 | 사용 설정 · 지원 이메일 등록 | 완료 |
| 승인된 도메인 | `localhost`, `mildangboy.github.io` | 완료 |
| OAuth JS 원본 | `http://localhost:5173`, `https://mildangboy.github.io` 포함 | 완료 |
| 웹 API 키 | Firestore · Identity Toolkit · Token Service 허용 | 완료 |
| `.env` | 세 값 기록됨 | 완료 |
| Gmail API | 사용 설정됨 | 완료 |
| `gmail.send` 범위 | 데이터 액세스에 등록 (민감한 범위) | 완료 |
| 게시 상태 | **프로덕션** (테스트로 되돌리면 토큰이 7일 뒤 만료) | 완료 |
| Gmail 발송용 OAuth 클라이언트 | `Gmail Sender (race notifier)` | 완료 |
| 리프레시 토큰 | `credentials.local`에 보관 (Git 제외) | 완료 |
| Secret Manager | 4개 값 저장 | 완료 |
| Cloud Function | `notify-race-weather` · gen2 · 인증 필요 | 완료 |
| 스케줄러 | `race-weather-daily` 매일 09:00 KST | 완료 |
| **실제 발송 확인** | 2026-08-04 시험 발송 성공 (`sent: 1`) | 완료 |
| **GitHub Secrets** | 배포본 로그인용 3개 등록 | **남음** |

**설정은 모두 끝났습니다.** 다음 레이스(8/23 네덜란드 GP) 전날인 8월 22일 09:00에
알림을 켜둔 플랜이 있으면 자동으로 메일이 나갑니다.

코드를 고쳤을 때는 `./deploy.sh`만 다시 돌리면 됩니다(준비 단계는 건너뜁니다).

GitHub Pages 배포본에서도 로그인을 쓰려면 저장소 **Settings → Secrets and variables → Actions**에
`VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_API_KEY`, `VITE_GOOGLE_CLIENT_ID` 세 개를 등록하세요.
(웹 API 키와 클라이언트 ID는 브라우저에 노출되는 값이라 비밀이 아니지만, 저장소에 직접 적지 않으려고 Secret으로 둡니다.
실제 보호는 규칙과 승인된 도메인이 합니다.)

---

## 설정 순서

아래 순서대로 진행하세요. `PROJECT_ID`는 본인 프로젝트 ID로 바꿔 넣으면 됩니다.

### 1. 프로젝트와 API 활성화

Google Cloud Console → 프로젝트 선택(또는 새로 만들기) 후, **API 및 서비스 → 라이브러리**에서 아래 네 가지를 켭니다.

- Cloud Firestore API
- Gmail API
- Cloud Functions API
- Cloud Scheduler API
- Secret Manager API

터미널로 한 번에 켜려면:

```bash
gcloud config set project PROJECT_ID
gcloud services enable firestore.googleapis.com gmail.googleapis.com \
  cloudfunctions.googleapis.com cloudscheduler.googleapis.com \
  secretmanager.googleapis.com run.googleapis.com cloudbuild.googleapis.com
```

### 2. Firestore 만들기

**Firestore → 데이터베이스 만들기 → Native 모드**, 위치는 `asia-northeast3`(서울)를 권장합니다.

보안 규칙(**규칙** 탭)에 `firestore.rules` 파일 내용을 그대로 붙여 넣습니다.

핵심은 세 가지입니다.

- **읽기**는 로그인한 사람 모두 (서로의 관전 플랜을 볼 수 있게)
- **수정·삭제**는 문서의 `ownerUid`가 토큰의 uid와 같을 때만
- 문서에 `email`·`phone` 같은 연락처는 **넣을 수 없음**
  → 목록이 공개라 담으면 남의 주소가 그대로 보입니다.
  알림은 계정 주소로만 나가고, 그 주소는 발송 시점에 함수가 Firebase Auth에서 읽습니다

### 2-1. 구글 로그인 켜기

공개 링크로 제출하므로 로그인이 필요합니다.

[Firebase 콘솔](https://console.firebase.google.com)에서 **프로젝트 추가 → 기존 Google Cloud 프로젝트 선택**으로 방금 만든 프로젝트를 연결합니다.

그다음 **Authentication → Sign-in method → Google → 사용 설정**합니다.

- **승인된 도메인**에 `localhost`와 `mildangboy.github.io`를 추가합니다
- 사용 설정하면 웹 클라이언트 ID가 자동 생성됩니다. **웹 SDK 구성**에서 복사해 둡니다

### 3. 웹 API 키 발급 (프런트가 Firestore를 부를 때 사용)

**API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → API 키**

만든 뒤 **키 제한**을 겁니다.

- 애플리케이션 제한: HTTP 리퍼러 → `https://mildangboy.github.io/*`, `http://localhost:5173/*`
- API 제한: Cloud Firestore API만 선택

이 키와 프로젝트 ID를 프런트 `.env`에 넣습니다.

```
VITE_FIREBASE_PROJECT_ID=PROJECT_ID
VITE_FIREBASE_API_KEY=발급받은_API_키
VITE_GOOGLE_CLIENT_ID=2-1에서_복사한_웹_클라이언트_ID
```

API 키 제한에서 **Identity Toolkit API**도 함께 허용해야 로그인이 됩니다.

### 4. OAuth 클라이언트 만들기 (Gmail 발송용) — 완료됨

**Google 인증 플랫폼 → 데이터 액세스**에 `https://www.googleapis.com/auth/gmail.send`가
민감한 범위로 등록돼 있고, **클라이언트**에 아래 클라이언트가 만들어져 있습니다.

- 이름: `Gmail Sender (race notifier)`
- 승인된 리디렉션 URI: `http://localhost:8910/callback`
- 클라이언트 ID·보안 비밀번호: `functions/credentials.local` (Git에 올라가지 않음)

> **게시 상태를 '테스트'로 되돌리지 마세요.**
> 게시 상태가 **테스트**인 앱은 리프레시 토큰이 **7일 뒤 만료**됩니다.
> 그러면 일주일 뒤부터 알림 메일이 조용히 끊깁니다.
> 이 프로젝트는 **프로덕션**으로 두었기 때문에 토큰이 계속 유효합니다.

앱 확인(verification)을 받지 않았으므로 동의 화면에 **"Google에서 확인하지 않은 앱"** 경고가 뜹니다.
본인 계정으로 쓰는 것이라 **고급 → (안전하지 않음) 이동**을 눌러 진행하면 됩니다.
확인받지 않은 상태에서는 이 범위를 승인한 계정이 100개로 제한되는데, 여기서는 발신 계정 하나만 쓰므로 문제없습니다.

### 5. 리프레시 토큰 발급 ← **여기부터 진행하세요**

```bash
cd functions
npm install
node get-refresh-token.mjs \
  400613322634-aad7j286gdeij8f8ten38pkkto8kudg5.apps.googleusercontent.com \
  "$(grep '^GMAIL_CLIENT_SECRET=' credentials.local | cut -d= -f2-)"
```

출력된 주소를 브라우저에서 열어 **snapdragon102030@gmail.com**으로 로그인·동의하면
터미널에 리프레시 토큰이 찍힙니다. 그 값을 `credentials.local`의 `GMAIL_REFRESH_TOKEN=` 뒤에 붙여넣으세요.

동의할 때 나오는 순서: 계정 선택 → "확인하지 않은 앱" 경고 → **고급** → **SKALA Weather(으)로 이동** → **계속**.

### 6~8. 한 번에: `deploy.sh`

5단계까지 마쳤으면 **처음 한 번만** 아래처럼 전부 돌립니다.
API 활성화 · Secret 저장 · 권한 부여 · 함수 배포 · 스케줄러 등록을 순서대로 처리합니다.

```bash
cd functions
./deploy.sh --setup
```

그다음부터, 코드만 고쳤을 때는 준비 단계를 건너뜁니다.

```bash
./deploy.sh
```

준비 단계(API 활성화 · Secret · IAM · 반영 대기)는 한 번 해두면 다시 할 필요가 없는데
합치면 1분 넘게 걸립니다. 비밀값이나 권한을 바꿨을 때만 `--setup`을 다시 쓰면 됩니다.

- 값은 `credentials.local`에서 읽으므로 비밀값을 터미널에 붙여넣을 일이 없습니다
- 여러 번 실행해도 안전합니다 (있는 것은 갱신, 없는 것만 생성)
- `gcloud`가 없으면 https://cloud.google.com/sdk/docs/install 설치 후 `gcloud auth login`

아래 6~8단계는 이 스크립트가 무엇을 하는지에 대한 설명입니다.
직접 하나씩 확인하며 진행하고 싶을 때만 참고하세요.

### 6. 비밀값을 Secret Manager에 저장

```bash
printf '%s' "OPENWEATHER_키"      | gcloud secrets create openweather-key   --data-file=-
printf '%s' "OAUTH_클라이언트_ID"   | gcloud secrets create gmail-client-id   --data-file=-
printf '%s' "OAUTH_보안비밀번호"    | gcloud secrets create gmail-client-secret --data-file=-
printf '%s' "리프레시_토큰"         | gcloud secrets create gmail-refresh-token --data-file=-
```

함수를 돌리는 기본 서비스 계정(`<프로젝트번호>-compute@developer.gserviceaccount.com`)에
`roles/secretmanager.secretAccessor`를 줘야 합니다. 이걸 빠뜨리면 배포는 되는데 실행이 실패합니다.

### 7. 함수 배포

```bash
cd functions
gcloud functions deploy notify-race-weather \
  --gen2 --runtime=nodejs22 --region=asia-northeast3 \
  --source=. --entry-point=notifyRaceWeather \
  --trigger-http --no-allow-unauthenticated \
  --set-env-vars=GMAIL_SENDER=본인주소@gmail.com,TIME_ZONE=Asia/Seoul \
  --set-secrets=OPENWEATHER_API_KEY=openweather-key:latest,\
GMAIL_CLIENT_ID=gmail-client-id:latest,\
GMAIL_CLIENT_SECRET=gmail-client-secret:latest,\
GMAIL_REFRESH_TOKEN=gmail-refresh-token:latest
```

`--no-allow-unauthenticated`라 아무나 호출할 수 없습니다. Scheduler에게만 권한을 줍니다.

### 8. 스케줄러 등록

```bash
PROJECT_ID=$(gcloud config get-value project)
REGION=asia-northeast3
URL=$(gcloud functions describe notify-race-weather --gen2 --region=$REGION --format='value(serviceConfig.uri)')

# 스케줄러가 함수를 부를 때 쓸 서비스 계정
gcloud iam service-accounts create race-notifier --display-name="Race Notifier"
SA=race-notifier@$PROJECT_ID.iam.gserviceaccount.com

gcloud run services add-iam-policy-binding notify-race-weather \
  --region=$REGION --member=serviceAccount:$SA --role=roles/run.invoker

gcloud scheduler jobs create http race-weather-daily \
  --location=$REGION --schedule="0 9 * * *" --time-zone="Asia/Seoul" \
  --uri="$URL" --http-method=GET \
  --oidc-service-account-email=$SA --oidc-token-audience="$URL"
```

### 9. 동작 확인

```bash
# 스케줄을 기다리지 않고 지금 한 번 실행
gcloud scheduler jobs run race-weather-daily --location=asia-northeast3

# 로그 보기
gcloud functions logs read notify-race-weather --gen2 --region=asia-northeast3 --limit=20
```

내일이 레이스가 아니면 `sent: 0`과 함께 사유가 남습니다. 정상 동작입니다.

`gcloud functions logs read`는 gen2 함수의 `console.log`를 보여주지 않는 경우가 있습니다.
그럴 때는 로그 탐색기에서 아래 쿼리로 확인하세요.

```
resource.labels.service_name="notify-race-weather" logName:"stdout"
```

#### 특정 날짜로 시험 발송

레이스가 몇 주 뒤라 기다릴 수 없을 때, 그 날짜를 레이스 당일로 보고 한 번 돌릴 수 있습니다.

```bash
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  "https://asia-northeast3-numeric-melody-504500-q8.cloudfunctions.net/notify-race-weather?date=2026-08-23"
# → {"race":"네덜란드 그랑프리","sent":1,"failed":0}
```

날짜를 주지 않으면 평소대로 '내일'을 봅니다.
함수가 `--no-allow-unauthenticated`라 신원 토큰 없이는 호출할 수 없으므로,
이 파라미터가 외부에 열려 있는 것은 아닙니다.

`YYYY-MM-DD` 형식만 받고 `2026-02-30`처럼 달력에 없는 날짜는 400으로 거절합니다.

---

## 바로 메일을 받아보려면

레이스 전날까지 기다리기 어려우니, 테스트할 때는 캘린더의 날짜를 임시로 내일로 바꿔
배포한 뒤 실행하면 됩니다. 확인 후 원래 날짜로 되돌리세요.

`f1Calendar2026.js`에서 가까운 라운드의 `date`만 수정하면 됩니다.

## 로컬 테스트

발송 대상 선별과 메일 본문 생성은 외부 의존 없이 단위 테스트가 가능합니다.

```bash
npm test
```

## 비용

Cloud Functions·Scheduler·Firestore 모두 무료 한도가 넉넉합니다.
하루 1회 실행에 문서 수십 건 읽기 수준이라 사실상 무료 범위 안에서 동작합니다.
