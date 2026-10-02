#!/usr/bin/env bash
# Despliegue: backend en Cloud Run + frontend en Firebase Hosting.
# Uso: PROJECT_ID=mi-proyecto ./deploy.sh
set -euo pipefail
: "${PROJECT_ID:?Define PROJECT_ID}"
REGION="${REGION:-us-central1}"
SERVICE=onboarding-api

gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# Opcional: ANTHROPIC_API_KEY en Secret Manager para mensajes redactados por Claude
SECRET_FLAG=""
if gcloud secrets describe anthropic-api-key >/dev/null 2>&1; then
  SECRET_FLAG="--set-secrets=ANTHROPIC_API_KEY=anthropic-api-key:latest"
fi

gcloud run deploy "$SERVICE" --source backend --region "$REGION" \
  --allow-unauthenticated --max-instances 1 --memory 512Mi \
  --set-env-vars "DATABASE_PATH=/tmp/onboarding.db" $SECRET_FLAG

(cd frontend && npm ci && npm run build)
firebase deploy --only hosting --project "$PROJECT_ID"
