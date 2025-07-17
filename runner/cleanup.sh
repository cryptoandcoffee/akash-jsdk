#!/bin/bash
set -e

cd /home/runner

echo "🧹 Starting cleanup process..."

# Check if runner is configured
if [[ ! -f ".runner" ]]; then
    echo "⚠️  Runner not configured, nothing to clean up"
    exit 0
fi

# Determine API URL for removal token
if [[ "${GITHUB_REPOSITORY}" == *"/"* ]]; then
    # Repository level
    API_URL="https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/runners/remove-token"
else
    # Organization level
    API_URL="https://api.github.com/orgs/${GITHUB_REPOSITORY}/actions/runners/remove-token"
fi

# Get removal token from GitHub API
echo "🔑 Fetching removal token from GitHub..."
REMOVAL_TOKEN=$(curl -s -X POST \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Authorization: token ${GITHUB_ACCESS_TOKEN}" \
    "${API_URL}" \
    | jq -r .token 2>/dev/null || echo "")

if [[ -n "${REMOVAL_TOKEN}" && "${REMOVAL_TOKEN}" != "null" ]]; then
    echo "✅ Removal token obtained"
    
    # Remove runner from GitHub
    echo "🗑️  Removing runner from GitHub..."
    ./config.sh remove --token "${REMOVAL_TOKEN}" || echo "⚠️  Failed to remove runner (may already be removed)"
else
    echo "⚠️  Could not obtain removal token, runner may remain registered"
fi

# Stop any running processes
echo "🛑 Stopping runner processes..."
pkill -f "Runner.Listener" 2>/dev/null || true
pkill -f "Runner.Worker" 2>/dev/null || true

# Clean up work directory
if [[ -d "_work" ]]; then
    echo "🧽 Cleaning work directory..."
    rm -rf _work/* 2>/dev/null || true
fi

# Note: No Docker daemon cleanup needed since we don't run Docker inside the container

echo "✅ Cleanup completed"