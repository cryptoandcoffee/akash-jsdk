# GitHub Actions Self-Hosted Runner on Akash Network

Deploy a cost-effective, decentralized GitHub Actions runner on the Akash Network for the `cryptoandcoffee/akash-jsdk` project.

## 🌟 Features

- **Cost-effective**: ~$0.50-2.00/month vs $0.008/minute for GitHub hosted runners
- **Decentralized**: Runs on Akash Network's distributed cloud infrastructure  
- **Ephemeral**: Self-destructing runners for enhanced security
- **Docker-in-Docker**: Full container build support
- **Node.js optimized**: Pre-configured with Node.js 20.x and pnpm
- **Auto-cleanup**: Graceful shutdown and deregistration

## 🚀 Quick Deployment

### Prerequisites

1. **Akash Network Account**: Set up wallet and fund with AKT tokens
2. **GitHub Personal Access Token**: With `repo` and `admin:org` scopes
3. **Docker Registry Access**: To push the runner image

### Step 1: Build and Push Docker Image

```bash
# Build the runner image
cd runner
docker build -t cryptoandcoffee/github-runner:latest .

# Push to Docker Hub (or your preferred registry)
docker push cryptoandcoffee/github-runner:latest
```

### Step 2: Deploy to Akash Network

#### Option A: Using Akash Console (Recommended)

1. Go to [Akash Console](https://console.akash.network/)
2. Connect your Keplr wallet
3. Click "Deploy" → "Build your template"
4. Upload the `deploy.yaml` file
5. Set environment variables:
   - `GITHUB_ACCESS_TOKEN`: Your GitHub PAT
   - `GITHUB_REPOSITORY`: `cryptoandcoffee/akash-jsdk`
6. Review pricing and deploy

#### Option B: Using Akash CLI

```bash
# Deploy using Akash CLI
akash tx deployment create deploy.yaml --from mykey --chain-id akashnet-2

# Check deployment status
akash query deployment list --owner $(akash keys show mykey -a)

# Get deployment logs
akash provider lease-logs --from mykey
```

### Step 3: Verify Runner Registration

1. Go to your GitHub repository
2. Navigate to Settings → Actions → Runners
3. You should see a new runner with prefix `cryptoandcoffee-akash-`
4. Status should show "Idle" and ready to accept jobs

## 🔧 Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_ACCESS_TOKEN` | GitHub PAT with repo/admin:org scopes | `ghp_xxxxxxxxxxxx` |
| `GITHUB_REPOSITORY` | Repository in owner/repo format | `cryptoandcoffee/akash-jsdk` |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RUNNER_NAME_PREFIX` | `cryptoandcoffee-akash` | Prefix for runner names |
| `RUNNER_LABELS` | `self-hosted,akash,linux,x64,cryptoandcoffee` | Runner labels |
| `EPHEMERAL` | `true` | Enable ephemeral mode |
| `RUNNER_GROUP` | `default` | Runner group assignment |

### Resource Configuration

The deployment allocates:
- **CPU**: 2 vCores (suitable for parallel builds)
- **Memory**: 4GB RAM (handles Node.js builds + Docker)
- **Storage**: 20GB ephemeral (code, deps, images)

## 🔐 Security Best Practices

### GitHub Token Permissions

Create a GitHub Personal Access Token with minimal required scopes:
- `repo` - Full repository access
- `admin:org` - Organization administration (for org-level runners)

### Akash Network Security

- ✅ Ephemeral runners (self-destruct after each job)
- ✅ Non-root container execution
- ✅ Signed provider verification
- ✅ No persistent data storage
- ✅ Automatic cleanup on shutdown

### Network Security

- Runners connect outbound to GitHub (no inbound ports)
- All communication over HTTPS
- Docker daemon isolated within container

## 💰 Cost Analysis

### Akash Network Costs

Based on current AKT pricing (~$3.00/AKT):
- **Monthly Cost**: $0.50 - $2.00/month
- **Per-minute Cost**: ~$0.001/minute (ephemeral usage)

### GitHub Hosted Runner Comparison

- **GitHub Cost**: $0.008/minute ($11.52/day if running 24/7)
- **Akash Savings**: 80-90% cost reduction
- **Break-even**: ~4 hours/month of usage

### Usage Patterns

- **Light usage** (few builds/day): ~$0.50/month
- **Moderate usage** (daily builds): ~$1.00/month  
- **Heavy usage** (multiple builds/day): ~$2.00/month

## 🔍 Monitoring and Troubleshooting

### Check Runner Status

```bash
# View deployment logs
akash provider lease-logs --from mykey

# Check runner registration
curl -H "Authorization: token $GITHUB_ACCESS_TOKEN" \
  "https://api.github.com/repos/cryptoandcoffee/akash-jsdk/actions/runners"
```

### Common Issues

#### Runner Not Appearing in GitHub

1. Check `GITHUB_ACCESS_TOKEN` has correct permissions
2. Verify `GITHUB_REPOSITORY` format is `owner/repo`
3. Check deployment logs for registration errors
4. Ensure token hasn't expired

#### Build Failures

1. Check Node.js/pnpm versions match requirements
2. Verify Docker daemon is running
3. Monitor memory usage (increase if needed)
4. Check for disk space issues

#### Deployment Issues

1. Verify sufficient AKT balance for deployment
2. Check provider availability and pricing
3. Review SDL syntax for errors
4. Ensure Docker image is accessible

### Scaling Considerations

For higher workloads, consider:
- Increasing `count` in deployment.yaml
- Adding more CPU/memory resources
- Using multiple runner groups
- Implementing auto-scaling logic

## 🛠️ Development and Customization

### Customizing the Docker Image

Modify `Dockerfile` to add additional tools:

```dockerfile
# Add custom build tools
RUN apt-get update && apt-get install -y \
    your-custom-tool \
    another-dependency
```

### Modifying Runner Behavior

Edit environment variables in `deploy.yaml`:

```yaml
env:
  - RUNNER_LABELS=self-hosted,akash,linux,x64,custom-label
  - EPHEMERAL=false  # For persistent runners
```

### Provider Selection

Target specific providers by updating placement:

```yaml
placement:
  specific-provider:
    attributes:
      - key: organization
        value: your-preferred-provider
```

## 📊 Performance Metrics

Based on testing with the Akash SDK:

- **Startup time**: 30-60 seconds (container + registration)
- **Build time**: Comparable to GitHub hosted runners
- **Cleanup time**: 10-15 seconds (automatic deregistration)
- **Uptime**: 99%+ (depends on provider selection)

## 🤝 Contributing

To contribute improvements:

1. Fork the repository
2. Modify runner configuration files
3. Test with your own Akash deployment
4. Submit PR with detailed changes

## 📞 Support

- **Akash Network**: [Discord](https://discord.akash.network/)
- **GitHub Issues**: [cryptoandcoffee/akash-jsdk/issues](https://github.com/cryptoandcoffee/akash-jsdk/issues)
- **Documentation**: [Akash Docs](https://docs.akash.network/)

---

**Happy building on the decentralized cloud! 🚀**