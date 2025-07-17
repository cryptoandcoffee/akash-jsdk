#!/bin/bash
set -e

echo "🚀 Starting cryptoandcoffee/github-runner on Akash Network"
echo "Repository: ${GITHUB_REPOSITORY}"
echo "Runner Labels: ${RUNNER_LABELS}"
echo "Ephemeral Mode: ${EPHEMERAL}"

# Validate required environment variables
if [[ -z "${GITHUB_ACCESS_TOKEN}" ]]; then
    echo "❌ ERROR: GITHUB_ACCESS_TOKEN is required"
    exit 1
fi

if [[ -z "${GITHUB_REPOSITORY}" ]]; then
    echo "❌ ERROR: GITHUB_REPOSITORY is required (format: owner/repo)"
    exit 1
fi

# Start Docker daemon in background if not running
if ! pgrep dockerd > /dev/null; then
    echo "🐳 Starting Docker daemon..."
    sudo dockerd &
    # Wait for Docker to be ready
    while ! docker info > /dev/null 2>&1; do
        echo "⏳ Waiting for Docker daemon to start..."
        sleep 2
    done
    echo "✅ Docker daemon is ready"
fi

# Set up signal handlers for graceful shutdown
cleanup_and_exit() {
    echo "🛑 Received shutdown signal, cleaning up..."
    /home/runner/cleanup.sh
    exit 0
}

trap cleanup_and_exit SIGTERM SIGINT

# Start the runner
echo "🏃 Starting GitHub Actions runner..."
/home/runner/start.sh

# Keep the container running
echo "✅ Runner started successfully, monitoring..."
wait