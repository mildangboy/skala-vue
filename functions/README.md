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

- 로그인한 사용자의 **본인 문서만** 읽기·수정·삭제
- 문서의 `ownerUid`가 토큰의 uid와 일치해야 저장 가능
- 저장하려는 `email`이 **계정에 등록된 주소와 같아야** 함
  → 이 조건이 없으면 남의 주소를 적어 알림 메일을 보내게 만들 수 있습니다

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

### 4. OAuth 클라이언트 만들기 (Gmail 발송용)

**API 및 서비스 → OAuth 동의 화면**

- User Type: 외부
- 앱 이름·지원 이메일 입력
- 범위 추가: `https://www.googleapis.com/auth/gmail.send`
- **테스트 사용자에 본인 Gmail 주소를 추가** ← 이걸 해야 검증 없이 쓸 수 있습니다
- 게시 상태는 **테스트**로 둡니다

그다음 **사용자 인증 정보 → OAuth 클라이언트 ID → 웹 애플리케이션**

- 승인된 리디렉션 URI: `http://localhost:8910/callback`
- 만들어진 **클라이언트 ID**와 **클라이언트 보안 비밀번호**를 복사해 둡니다

### 5. 리프레시 토큰 발급

```bash
cd functions
npm install
node get-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>
```

출력된 주소를 브라우저에서 열어 로그인·동의하면 터미널에 리프레시 토큰이 찍힙니다.

### 6. 비밀값을 Secret Manager에 저장

```bash
printf '%s' "OPENWEATHER_키"      | gcloud secrets create openweather-key   --data-file=-
printf '%s' "OAUTH_클라이언트_ID"   | gcloud secrets create gmail-client-id   --data-file=-
printf '%s' "OAUTH_보안비밀번호"    | gcloud secrets create gmail-client-secret --data-file=-
printf '%s' "리프레시_토큰"         | gcloud secrets create gmail-refresh-token --data-file=-
```

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
