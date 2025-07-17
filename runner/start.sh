#!/bin/bash
set -e

cd /home/runner

# Generate unique runner name with timestamp
RUNNER_NAME="${RUNNER_NAME_PREFIX}-$(date +%s)-$(hostname | cut -c1-8)"
echo "🏷️  Runner name: ${RUNNER_NAME}"

# Determine if this is organization or repository level
if [[ "${GITHUB_REPOSITORY}" == *"/"* ]]; then
    # Repository level runner
    GITHUB_URL="https://github.com/${GITHUB_REPOSITORY}"
    API_URL="https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/runners/registration-token"
    echo "🔑 Fetching repository-level registration token..."
else
    # Organization level runner  
    GITHUB_URL="https://github.com/${GITHUB_REPOSITORY}"
    API_URL="https://api.github.com/orgs/${GITHUB_REPOSITORY}/actions/runners/registration-token"
    echo "🔑 Fetching organization-level registration token..."
fi

REGISTRATION_TOKEN=$(curl -s -X POST \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Authorization: token ${GITHUB_ACCESS_TOKEN}" \
    "${API_URL}" \
    | jq -r .token)

if [[ "${REGISTRATION_TOKEN}" == "null" || -z "${REGISTRATION_TOKEN}" ]]; then
    echo "❌ Failed to get registration token. Check your GITHUB_ACCESS_TOKEN and repository permissions."
    exit 1
fi

echo "✅ Registration token obtained"

# Configure runner
echo "⚙️  Configuring GitHub Actions runner..."
CONFIGURE_ARGS=(
    --url "${GITHUB_URL}"
    --token "${REGISTRATION_TOKEN}"
    --name "${RUNNER_NAME}"
    --labels "${RUNNER_LABELS}"
    --work "_work"
    --unattended
    --replace
)

# Add ephemeral flag if enabled
if [[ "${EPHEMERAL}" == "true" ]]; then
    CONFIGURE_ARGS+=(--ephemeral)
    echo "🔄 Ephemeral mode enabled - runner will self-destruct after one job"
fi

# Add runner group if specified
if [[ -n "${RUNNER_GROUP}" && "${RUNNER_GROUP}" != "default" ]]; then
    CONFIGURE_ARGS+=(--runnergroup "${RUNNER_GROUP}")
fi

# Configure the runner
./config.sh "${CONFIGURE_ARGS[@]}"

if [[ $? -eq 0 ]]; then
    echo "✅ Runner configured successfully"
else
    echo "❌ Failed to configure runner"
    exit 1
fi

# Start the runner
echo "🚀 Starting runner listener..."
exec ./run.sh