#!/usr/bin/env bash
# Despliegue: backend en Cloud Run + frontend en Firebase Hosting.
# Uso: PROJECT_ID=mi-proyecto ./deploy.sh
set -euo pipefail
: "${PROJECT_ID:?Define PROJECT_ID}"
REGION="${REGION:-us-central1}"
SERVICE=onboarding-api

gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# OPENAI_API_KEY desde Secret Manager (nunca como env var en texto plano).
# Crear una vez:  printf "sk-..." | gcloud secrets create openai-api-key --data-file=-
SECRET_FLAG=""
if gcloud secrets describe openai-api-key >/dev/null 2>&1; then
  SECRET_FLAG="--set-secrets=OPENAI_API_KEY=openai-api-key:latest"
fi

# Auth: crear una vez los secretos con los valores de backend/.env
#   printf '%s' "$AUTH_PASSWORD_HASH" | gcloud secrets create auth-password-hash --data-file=-
#   printf '%s' "$AUTH_TOKEN_SECRET"  | gcloud secrets create auth-token-secret --data-file=-
AUTH_SECRETS="AUTH_PASSWORD_HASH=auth-password-hash:latest,AUTH_TOKEN_SECRET=auth-token-secret:latest"
if [ -n "$SECRET_FLAG" ]; then SECRET_FLAG="$SECRET_FLAG,$AUTH_SECRETS"; else SECRET_FLAG="--set-secrets=$AUTH_SECRETS"; fi

# La cuenta de servicio de Cloud Run necesita leer los secretos
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud projects add-iam-policy-binding "$PROJECT_ID" --quiet   --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"   --role=roles/secretmanager.secretAccessor >/dev/null

gcloud run deploy "$SERVICE" --source backend --region "$REGION" \
  --allow-unauthenticated --max-instances 1 --memory 512Mi \
  --set-env-vars "DATABASE_PATH=/tmp/onboarding.db,OPENAI_MODEL=${OPENAI_MODEL:-gpt-5-mini},OPENAI_REASONING_EFFORT=low,LLM_TIMEOUT_SECONDS=30,CORS_ORIGINS=https://${PROJECT_ID}.web.app,AUTH_USERNAME=evaluador,ENABLE_DOCS=false" $SECRET_FLAG

(cd frontend && npm ci && npm run build)
firebase deploy --only hosting --project "$PROJECT_ID"
