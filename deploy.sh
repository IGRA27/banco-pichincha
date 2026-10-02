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
  PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
  gcloud secrets add-iam-policy-binding openai-api-key --quiet     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"     --role=roles/secretmanager.secretAccessor >/dev/null
fi

gcloud run deploy "$SERVICE" --source backend --region "$REGION" \
  --allow-unauthenticated --max-instances 1 --memory 512Mi \
  --set-env-vars "DATABASE_PATH=/tmp/onboarding.db,OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o-mini},CORS_ORIGINS=https://${PROJECT_ID}.web.app" $SECRET_FLAG

(cd frontend && npm ci && npm run build)
firebase deploy --only hosting --project "$PROJECT_ID"
