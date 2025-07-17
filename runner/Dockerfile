# GitHub Actions Self-Hosted Runner for Akash Network
# Optimized for cryptoandcoffee/akash-jsdk CI/CD pipeline

FROM ubuntu:22.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Set runner version and architecture
ARG RUNNER_VERSION="2.321.0"
ARG RUNNER_ARCH="x64"

# Create runner user for security
RUN useradd -m -s /bin/bash runner && \
    usermod -aG sudo runner && \
    echo 'runner ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# Install essential packages for GitHub Actions and Node.js builds
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    jq \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3 \
    python3-pip \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    unzip \
    tar \
    && rm -rf /var/lib/apt/lists/*

# Install Docker for Docker-in-Docker support
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce docker-ce-cli containerd.io && \
    usermod -aG docker runner

# Install Node.js 20.x LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Install pnpm globally
RUN npm install -g pnpm@latest

# Install GitHub CLI for advanced GitHub operations
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install gh -y

# Switch to runner user
USER runner
WORKDIR /home/runner

# Download and install GitHub Actions runner
RUN curl -o actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz \
    -L https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz && \
    tar xzf actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz && \
    rm actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz

# Install runner dependencies
RUN sudo ./bin/installdependencies.sh

# Copy custom scripts
COPY --chown=runner:runner start.sh /home/runner/start.sh
COPY --chown=runner:runner cleanup.sh /home/runner/cleanup.sh
COPY --chown=runner:runner entrypoint.sh /home/runner/entrypoint.sh

# Make scripts executable
RUN chmod +x /home/runner/*.sh

# Set environment variables with defaults
ENV GITHUB_REPOSITORY=""
ENV GITHUB_ACCESS_TOKEN=""
ENV RUNNER_NAME_PREFIX="cryptoandcoffee-akash"
ENV RUNNER_LABELS="self-hosted,akash,linux,x64,cryptoandcoffee"
ENV EPHEMERAL="true"
ENV RUNNER_GROUP="default"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD pgrep -f "Runner.Listener" > /dev/null || exit 1

# Expose no ports (runner connects outbound to GitHub)
EXPOSE

# Set entrypoint
ENTRYPOINT ["/home/runner/entrypoint.sh"]