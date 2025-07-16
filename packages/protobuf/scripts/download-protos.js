import { execSync } from 'child_process'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const protoDownloadDir = join(rootDir, 'proto-downloaded')

console.log('📥 Downloading official Akash Network proto definitions...')

// Clean up previous downloads
if (existsSync(protoDownloadDir)) {
  rmSync(protoDownloadDir, { recursive: true, force: true })
}
mkdirSync(protoDownloadDir, { recursive: true })

try {
  // Clone the official Akash API repository
  console.log('   Cloning akash-network/akash-api...')
  execSync(`git clone --depth 1 https://github.com/akash-network/akash-api.git ${protoDownloadDir}/akash-api`, {
    stdio: 'pipe'
  })

  // Also get Cosmos SDK and IBC protos for dependencies
  console.log('   Cloning cosmos/cosmos-sdk...')
  execSync(`git clone --depth 1 --branch v0.47.8 https://github.com/cosmos/cosmos-sdk.git ${protoDownloadDir}/cosmos-sdk`, {
    stdio: 'pipe'
  })

  console.log('   Cloning cosmos/ibc-go...')
  execSync(`git clone --depth 1 --branch v7.3.0 https://github.com/cosmos/ibc-go.git ${protoDownloadDir}/ibc-go`, {
    stdio: 'pipe'
  })

  // Copy relevant proto files to our proto directory
  const protoDir = join(rootDir, 'proto')
  if (existsSync(protoDir)) {
    rmSync(protoDir, { recursive: true, force: true })
  }
  mkdirSync(protoDir, { recursive: true })

  // Copy Akash Network specific protos
  const akashProtoSrc = join(protoDownloadDir, 'akash-api/proto')
  if (existsSync(akashProtoSrc)) {
    execSync(`cp -r ${akashProtoSrc}/* ${protoDir}/`, { stdio: 'pipe' })
    console.log('   ✅ Copied Akash Network proto definitions')
  } else {
    console.warn('   ⚠️  Akash proto directory not found, using fallback structure')
  }

  // Copy essential Cosmos SDK protos
  const cosmosProtoSrc = join(protoDownloadDir, 'cosmos-sdk/proto')
  if (existsSync(cosmosProtoSrc)) {
    execSync(`cp -r ${cosmosProtoSrc}/cosmos ${protoDir}/`, { stdio: 'pipe' })
    console.log('   ✅ Copied Cosmos SDK proto definitions')
  }

  // Copy IBC protos
  const ibcProtoSrc = join(protoDownloadDir, 'ibc-go/proto')
  if (existsSync(ibcProtoSrc)) {
    execSync(`cp -r ${ibcProtoSrc}/ibc ${protoDir}/`, { stdio: 'pipe' })
    console.log('   ✅ Copied IBC proto definitions')
  }

  console.log('🎉 Successfully downloaded all proto definitions!')

} catch (error) {
  console.error('❌ Error downloading proto files:', error.message)
  
  // Create fallback proto structure with essential types
  console.log('📋 Creating fallback proto structure...')
  const fallbackProtos = {
    'akash/deployment/v1beta3/deployment.proto': `
syntax = "proto3";
package akash.deployment.v1beta3;

message DeploymentID {
  string owner = 1;
  uint64 dseq = 2;
}

enum Deployment_State {
  invalid = 0;
  active = 1;
  closed = 2;
}

message Deployment {
  DeploymentID deployment_id = 1;
  Deployment_State state = 2;
  bytes version = 3;
  int64 created_at = 4;
}
`,
    'akash/market/v1beta4/lease.proto': `
syntax = "proto3";
package akash.market.v1beta4;

message LeaseID {
  string owner = 1;
  uint64 dseq = 2;
  uint32 gseq = 3;
  uint32 oseq = 4;
  string provider = 5;
}

enum Lease_State {
  invalid = 0;
  active = 1;
  insufficient_funds = 2;
  closed = 3;
}

message DecCoin {
  string denom = 1;
  string amount = 2;
}

message Lease {
  LeaseID lease_id = 1;
  Lease_State state = 2;
  DecCoin price = 3;
  int64 created_at = 4;
  int64 closed_on = 5;
}
`
  }

  // Create fallback structure
  for (const [path, content] of Object.entries(fallbackProtos)) {
    const fullPath = join(protoDir, path)
    const dir = dirname(fullPath)
    mkdirSync(dir, { recursive: true })
    
    const { writeFileSync } = await import('fs')
    writeFileSync(fullPath, content.trim())
  }
  
  console.log('✅ Created fallback proto definitions')
}

// Clean up downloaded repositories
if (existsSync(protoDownloadDir)) {
  rmSync(protoDownloadDir, { recursive: true, force: true })
}

console.log('🧹 Cleaned up temporary files')