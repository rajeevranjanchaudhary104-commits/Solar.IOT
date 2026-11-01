#!/bin/bash
# ==============================================================================
# Farm.IOT / Solar.IOT - Firebase Hosting Deploy Script (Secondary Account)
# ==============================================================================
set -e

echo "🚀 Building production assets..."
npm run build

echo ""
echo "📦 Build completed in ./dist"
echo ""

# Check if project ID is provided as argument
SECONDARY_PROJECT="$1"

if [ -z "$SECONDARY_PROJECT" ]; then
  echo "ℹ️  Usage: ./scripts/deploy-firebase-hosting.sh <your-secondary-project-id>"
  echo "⚡ Deploying to active configured Firebase project..."
  npx -y firebase-tools deploy --only hosting
else
  echo "⚡ Deploying to secondary Firebase project: $SECONDARY_PROJECT"
  npx -y firebase-tools deploy --only hosting --project "$SECONDARY_PROJECT"
fi

echo ""
echo "🎉 Deployment finished successfully!"
