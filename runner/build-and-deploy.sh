#!/bin/bash
set -e

# Build and deploy script for cryptoandcoffee/github-runner on Akash Network
echo "🚀 Building and deploying GitHub Actions runner to Akash Network"

# Configuration
DOCKER_IMAGE="cryptoandcoffee/github-runner"
TAG="${1:-latest}"
FULL_IMAGE="${DOCKER_IMAGE}:${TAG}"

# Check if required tools are installed
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v akash >/dev/null 2>&1 || { echo "⚠️  Akash CLI not found. You'll need to deploy manually via Akash Console."; }

echo "📦 Building Docker image: ${FULL_IMAGE}"

# Build the Docker image
docker build -t "${FULL_IMAGE}" .

if [[ $? -eq 0 ]]; then
    echo "✅ Docker image built successfully"
else
    echo "❌ Docker build failed"
    exit 1
fi

# Ask if user wants to push to registry
read -p "🤔 Push image to Docker Hub? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Pushing image to Docker Hub..."
    docker push "${FULL_IMAGE}"
    
    if [[ $? -eq 0 ]]; then
        echo "✅ Image pushed successfully"
    else
        echo "❌ Push failed. Make sure you're logged in: docker login"
        exit 1
    fi
else
    echo "⏭️  Skipping push to registry"
fi

# Check for required environment variables
echo ""
echo "📋 Pre-deployment checklist:"
echo "1. ✅ Docker image built: ${FULL_IMAGE}"

if [[ -n "${GITHUB_ACCESS_TOKEN}" ]]; then
    echo "2. ✅ GITHUB_ACCESS_TOKEN is set"
else
    echo "2. ⚠️  GITHUB_ACCESS_TOKEN not set (you'll need to set this in Akash Console)"
fi

echo "3. 📄 Deployment file ready: deploy.yaml"
echo ""

# Display deployment instructions
echo "🎯 Next steps for Akash deployment:"
echo ""
echo "Option A - Akash Console (Recommended):"
echo "  1. Go to https://console.akash.network/"
echo "  2. Connect your Keplr wallet"
echo "  3. Click 'Deploy' → 'Build your template'"
echo "  4. Upload deploy.yaml from this directory"
echo "  5. Set environment variables:"
echo "     - GITHUB_ACCESS_TOKEN: your_github_pat_here"
echo "     - GITHUB_REPOSITORY: cryptoandcoffee/akash-jsdk"
echo "  6. Review pricing and deploy"
echo ""

if command -v akash >/dev/null 2>&1; then
    echo "Option B - Akash CLI:"
    echo "  1. akash tx deployment create deploy.yaml --from mykey --chain-id akashnet-2"
    echo "  2. akash query deployment list --owner \$(akash keys show mykey -a)"
    echo "  3. akash provider lease-logs --from mykey"
    echo ""
fi

echo "🔍 After deployment:"
echo "  1. Check GitHub repo Settings → Actions → Runners"
echo "  2. Look for runner named 'cryptoandcoffee-akash-*'"
echo "  3. Status should show 'Idle' when ready"
echo ""

echo "💰 Estimated costs:"
echo "  - Light usage: ~\$0.50/month"
echo "  - Moderate usage: ~\$1.00/month"
echo "  - Heavy usage: ~\$2.00/month"
echo ""

echo "✅ Ready for deployment!"