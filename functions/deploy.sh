#!/usr/bin/env bash
#
# 레이스 전날 알림 메일 — 6~8단계를 한 번에 (API 활성화 · Secret · 배포 · 스케줄러)
#
#   cd functions
#   ./deploy.sh
#
# 값은 credentials.local에서 읽으므로 터미널에 비밀값을 붙여넣을 일이 없습니다.
# 여러 번 실행해도 안전합니다 (이미 있는 것은 갱신하거나 건너뜁니다).

set -euo pipefail

PROJECT_ID=numeric-melody-504500-q8
REGION=asia-northeast3
FUNCTION=notify-race-weather
JOB=race-weather-daily
SA_NAME=race-notifier

cd "$(dirname "$0")"

# ── 사전 확인 ────────────────────────────────────────────────
command -v gcloud >/dev/null || {
  cat <<'HOWTO'
gcloud가 없습니다. 아래 중 하나로 설치한 뒤 다시 실행하세요.

  macOS (Homebrew):
    brew install --cask gcloud-cli
    exec $SHELL -l          # 새 터미널을 열어도 됩니다

  그 외:
    https://cloud.google.com/sdk/docs/install
HOWTO
  exit 1
}

gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | grep -q . || {
  echo "gcloud 로그인이 필요합니다:"
  echo "  gcloud auth login        # 브라우저가 열리면 snapdragon102030@gmail.com 선택"
  exit 1
}

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -1)
if [ "$ACTIVE_ACCOUNT" != "snapdragon102030@gmail.com" ]; then
  echo "현재 gcloud 계정: $ACTIVE_ACCOUNT"
  echo "이 프로젝트는 snapdragon102030@gmail.com 소유입니다. 계정을 바꾸려면:"
  echo "  gcloud config set account snapdragon102030@gmail.com"
  echo
  ok=""   # Ctrl-D로 입력이 끊겨도 set -u에 걸리지 않도록
  read -r -p "그래도 계속할까요? [y/N] " ok || true
  [ "$ok" = "y" ] || [ "$ok" = "Y" ] || exit 1
fi

[ -f credentials.local ] || { echo "credentials.local이 없습니다."; exit 1; }

# shellcheck disable=SC1091
set -a; source ./credentials.local; set +a

for var in GMAIL_CLIENT_ID GMAIL_CLIENT_SECRET GMAIL_REFRESH_TOKEN GMAIL_SENDER OPENWEATHER_API_KEY; do
  if [ -z "${!var:-}" ]; then
    echo "credentials.local의 $var 가 비어 있습니다."
    [ "$var" = "GMAIL_REFRESH_TOKEN" ] && echo "→ 5단계(node get-refresh-token.mjs ...)를 먼저 실행하세요."
    exit 1
  fi
done

gcloud config set project "$PROJECT_ID" >/dev/null
echo "프로젝트: $PROJECT_ID / 리전: $REGION"

# ── 1) 필요한 API 켜기 ───────────────────────────────────────
echo
echo "▶ API 활성화 (이미 켜져 있으면 그대로 넘어갑니다)"
gcloud services enable \
  gmail.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  eventarc.googleapis.com \
  cloudscheduler.googleapis.com \
  secretmanager.googleapis.com

# ── 2) Secret Manager ────────────────────────────────────────
put_secret() {           # put_secret <이름> <값>
  local name=$1 value=$2
  if gcloud secrets describe "$name" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- >/dev/null
    echo "  · $name 갱신"
  else
    printf '%s' "$value" | gcloud secrets create "$name" --replication-policy=automatic --data-file=- >/dev/null
    echo "  · $name 생성"
  fi
}

echo
echo "▶ 비밀값 저장"
put_secret openweather-key      "$OPENWEATHER_API_KEY"
put_secret gmail-client-id      "$GMAIL_CLIENT_ID"
put_secret gmail-client-secret  "$GMAIL_CLIENT_SECRET"
put_secret gmail-refresh-token  "$GMAIL_REFRESH_TOKEN"

# ── 2-1) 서비스 계정 권한 ────────────────────────────────────
#
# gen2 함수는 Cloud Build로 컨테이너를 만든 뒤 Cloud Run으로 돌린다.
# 두 단계 모두 기본 Compute 서비스 계정을 쓰는데,
# 2024년 이후 만들어진 프로젝트에는 빌드 권한이 자동으로 붙지 않아
# "missing the [roles/cloudbuild.builds.builder] role"로 배포가 실패한다.
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
[ -n "$PROJECT_NUMBER" ] || { echo "프로젝트 번호를 읽지 못했습니다."; exit 1; }
RUNTIME_SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

echo
echo "▶ 서비스 계정 권한 ($RUNTIME_SA)"
for role in \
  roles/cloudbuild.builds.builder \
  roles/artifactregistry.writer \
  roles/storage.objectAdmin \
  roles/logging.logWriter \
  roles/datastore.user
do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$RUNTIME_SA" --role="$role" \
    --condition=None >/dev/null
  echo "  · $role"
done

echo
echo "▶ 함수 실행 계정에 비밀값 읽기 권한"
for s in openweather-key gmail-client-id gmail-client-secret gmail-refresh-token; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:$RUNTIME_SA" \
    --role=roles/secretmanager.secretAccessor >/dev/null
done
echo "  · 완료"

# IAM 변경이 퍼지는 데 시간이 걸린다. 바로 배포하면 같은 오류가 다시 날 수 있다.
echo
echo "▶ 권한 반영 대기 (30초)"
sleep 30

# ── 3) 함수 배포 ─────────────────────────────────────────────
echo
echo "▶ 함수 배포 (몇 분 걸립니다)"
gcloud functions deploy "$FUNCTION" \
  --gen2 --runtime=nodejs22 --region="$REGION" \
  --source=. --entry-point=notifyRaceWeather \
  --trigger-http --no-allow-unauthenticated \
  --set-env-vars="GMAIL_SENDER=$GMAIL_SENDER,TIME_ZONE=Asia/Seoul" \
  --set-secrets="OPENWEATHER_API_KEY=openweather-key:latest,GMAIL_CLIENT_ID=gmail-client-id:latest,GMAIL_CLIENT_SECRET=gmail-client-secret:latest,GMAIL_REFRESH_TOKEN=gmail-refresh-token:latest"

URL=$(gcloud functions describe "$FUNCTION" --gen2 --region="$REGION" --format='value(serviceConfig.uri)')
# 주소를 못 읽으면 스케줄러가 빈 URI로 만들어져 조용히 실패한다
[ -n "$URL" ] || { echo "함수 주소를 읽지 못했습니다. 배포 상태를 확인하세요."; exit 1; }
echo "  · 주소: $URL"

# ── 4) 스케줄러 ──────────────────────────────────────────────
SA="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

echo
echo "▶ 스케줄러"
if gcloud iam service-accounts describe "$SA" >/dev/null 2>&1; then
  echo "  · 서비스 계정 있음"
else
  gcloud iam service-accounts create "$SA_NAME" --display-name="Race Notifier" >/dev/null
  echo "  · 서비스 계정 생성"
fi

# 방금 만든 계정은 IAM 전역에 퍼지는 데 시간이 걸린다.
# 바로 권한을 주려 하면 "does not exist"가 뜨므로 보일 때까지 기다린다.
printf '  · 계정 전파 대기'
for _ in $(seq 1 20); do
  gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 && break
  printf '.'
  sleep 3
done
echo

# 함수는 --no-allow-unauthenticated라 이 계정에만 호출 권한을 준다.
# describe가 성공해도 Run 쪽에서 아직 못 보는 경우가 있어 몇 번 더 시도한다.
bound=0
for attempt in $(seq 1 10); do
  if gcloud run services add-iam-policy-binding "$FUNCTION" \
       --region="$REGION" --member="serviceAccount:$SA" \
       --role=roles/run.invoker >/dev/null 2>&1; then
    bound=1
    # 한글이 바로 붙으면 변수명으로 먹히므로 중괄호로 끊는다
    echo "  · 호출 권한 부여 (시도 ${attempt}회)"
    break
  fi
  sleep 6
done

if [ "$bound" -ne 1 ]; then
  echo
  echo "호출 권한을 주지 못했습니다. 잠시 뒤 아래를 직접 실행하거나 ./deploy.sh를 다시 돌려주세요."
  echo "  gcloud run services add-iam-policy-binding $FUNCTION \\"
  echo "    --region=$REGION --member=serviceAccount:$SA --role=roles/run.invoker"
  exit 1
fi

if gcloud scheduler jobs describe "$JOB" --location="$REGION" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "$JOB" \
    --location="$REGION" --schedule="0 9 * * *" --time-zone="Asia/Seoul" \
    --uri="$URL" --http-method=GET \
    --oidc-service-account-email="$SA" --oidc-token-audience="$URL" >/dev/null
  echo "  · 기존 작업 갱신 (매일 09:00 KST)"
else
  gcloud scheduler jobs create http "$JOB" \
    --location="$REGION" --schedule="0 9 * * *" --time-zone="Asia/Seoul" \
    --uri="$URL" --http-method=GET \
    --oidc-service-account-email="$SA" --oidc-token-audience="$URL" >/dev/null
  echo "  · 작업 생성 (매일 09:00 KST)"
fi

cat <<MSG

────────────────────────────────────────────────────────
배포가 끝났습니다.

지금 한 번 실행해 보려면:
  gcloud scheduler jobs run $JOB --location=$REGION

로그 보기:
  gcloud functions logs read $FUNCTION --gen2 --region=$REGION --limit=20

내일이 레이스가 아니면 'sent: 0'과 사유가 남습니다. 정상입니다.
────────────────────────────────────────────────────────
MSG
