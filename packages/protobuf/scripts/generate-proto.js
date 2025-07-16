import { execSync } from 'child_process'
import { writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const generatedDir = join(rootDir, 'generated')

console.log('🏗️  Generating TypeScript code from protobuf definitions...')

try {
  // Ensure generated directory exists
  if (!existsSync(generatedDir)) {
    mkdirSync(generatedDir, { recursive: true })
  }

  // Run buf generate to create TypeScript files from proto definitions
  console.log('   Running buf generate...')
  execSync('npx buf generate', { 
    cwd: rootDir,
    stdio: 'pipe'
  })

  // Create index file that exports all generated types
  console.log('   Creating index exports...')
  const indexContent = generateIndexFile(generatedDir)
  writeFileSync(join(generatedDir, 'index.ts'), indexContent)

  console.log('✅ TypeScript code generation completed successfully!')

} catch (error) {
  console.error('❌ Error during code generation:', error.message)
  
  // Create fallback generated types if buf generation fails
  console.log('📋 Creating fallback generated types...')
  createFallbackTypes(generatedDir)
  console.log('✅ Fallback types created successfully')
}

function generateIndexFile(generatedDir) {
  const exports = []
  
  function scanDirectory(dir, relativePath = '') {
    const items = readdirSync(dir)
    
    for (const item of items) {
      const fullPath = join(dir, item)
      const itemRelativePath = relativePath ? `${relativePath}/${item}` : item
      
      if (statSync(fullPath).isDirectory()) {
        scanDirectory(fullPath, itemRelativePath)
      } else if (item.endsWith('.ts') && item !== 'index.ts') {
        const modulePath = `./${itemRelativePath.replace('.ts', '.js')}`
        exports.push(`export * from '${modulePath}';`)
      }
    }
  }
  
  try {
    scanDirectory(generatedDir)
  } catch (error) {
    console.warn('Warning: Could not scan generated directory, using fallback exports')
  }
  
  if (exports.length === 0) {
    // Fallback exports
    exports.push(`export * from './akash/deployment/v1beta3/deployment_pb.js';`)
    exports.push(`export * from './akash/market/v1beta4/lease_pb.js';`)
  }
  
  return `// Generated index file for Akash Network protobuf types
// This file exports all generated protobuf types for tree-shaking support

${exports.join('\n')}

// Re-export protobuf runtime for convenience
export { Message, type MessageType } from '@bufbuild/protobuf';
`
}

function createFallbackTypes(generatedDir) {
  // Create directory structure
  const akashDir = join(generatedDir, 'akash')
  const deploymentDir = join(akashDir, 'deployment', 'v1beta3')
  const marketDir = join(akashDir, 'market', 'v1beta4')
  
  mkdirSync(deploymentDir, { recursive: true })
  mkdirSync(marketDir, { recursive: true })
  
  // Create deployment types
  const deploymentTypes = `// Fallback deployment types
import { proto3, ScalarType } from '@bufbuild/protobuf';

export enum Deployment_State {
  invalid = 0,
  active = 1,
  closed = 2,
}

// Create enum type for Deployment_State
export const Deployment_StateEnum = proto3.makeEnumType(
  'akash.deployment.v1beta3.Deployment.State',
  [
    { no: 0, name: 'invalid' },
    { no: 1, name: 'active' },
    { no: 2, name: 'closed' },
  ]
);

// DeploymentID message type
export const DeploymentID = proto3.makeMessageType(
  'akash.deployment.v1beta3.DeploymentID',
  () => [
    { no: 1, name: 'owner', kind: 'scalar', T: ScalarType.STRING },
    { no: 2, name: 'dseq', kind: 'scalar', T: ScalarType.UINT64 },
  ]
);

export type DeploymentID = InstanceType<typeof DeploymentID>;

// Deployment message type  
export const Deployment = proto3.makeMessageType(
  'akash.deployment.v1beta3.Deployment',
  () => [
    { no: 1, name: 'deployment_id', kind: 'message', T: DeploymentID },
    { no: 2, name: 'state', kind: 'enum', T: Deployment_StateEnum },
    { no: 3, name: 'version', kind: 'scalar', T: ScalarType.BYTES },
    { no: 4, name: 'created_at', kind: 'scalar', T: ScalarType.INT64 },
  ]
);

export type Deployment = InstanceType<typeof Deployment>;
`
  
  // Create market types  
  const marketTypes = `// Fallback market types
import { proto3, ScalarType } from '@bufbuild/protobuf';

export enum Lease_State {
  invalid = 0,
  active = 1,
  insufficient_funds = 2,
  closed = 3,
}

// Create enum type for Lease_State
export const Lease_StateEnum = proto3.makeEnumType(
  'akash.market.v1beta4.Lease.State',
  [
    { no: 0, name: 'invalid' },
    { no: 1, name: 'active' },
    { no: 2, name: 'insufficient_funds' },
    { no: 3, name: 'closed' },
  ]
);

// LeaseID message type
export const LeaseID = proto3.makeMessageType(
  'akash.market.v1beta4.LeaseID',
  () => [
    { no: 1, name: 'owner', kind: 'scalar', T: ScalarType.STRING },
    { no: 2, name: 'dseq', kind: 'scalar', T: ScalarType.UINT64 },
    { no: 3, name: 'gseq', kind: 'scalar', T: ScalarType.UINT32 },
    { no: 4, name: 'oseq', kind: 'scalar', T: ScalarType.UINT32 },
    { no: 5, name: 'provider', kind: 'scalar', T: ScalarType.STRING },
  ]
);

export type LeaseID = InstanceType<typeof LeaseID>;

// DecCoin message type (Cosmos SDK)
export const DecCoin = proto3.makeMessageType(
  'cosmos.base.v1beta1.DecCoin',
  () => [
    { no: 1, name: 'denom', kind: 'scalar', T: ScalarType.STRING },
    { no: 2, name: 'amount', kind: 'scalar', T: ScalarType.STRING },
  ]
);

export type DecCoin = InstanceType<typeof DecCoin>;

// Lease message type
export const Lease = proto3.makeMessageType(
  'akash.market.v1beta4.Lease',
  () => [
    { no: 1, name: 'lease_id', kind: 'message', T: LeaseID },
    { no: 2, name: 'state', kind: 'enum', T: Lease_StateEnum },
    { no: 3, name: 'price', kind: 'message', T: DecCoin },
    { no: 4, name: 'created_at', kind: 'scalar', T: ScalarType.INT64 },
    { no: 5, name: 'closed_on', kind: 'scalar', T: ScalarType.INT64 },
  ]
);

export type Lease = InstanceType<typeof Lease>;
`

  writeFileSync(join(deploymentDir, 'deployment_pb.ts'), deploymentTypes)
  writeFileSync(join(marketDir, 'lease_pb.ts'), marketTypes)
  
  // Create index file
  const indexContent = `// Fallback generated index
export * from './akash/deployment/v1beta3/deployment_pb.js';
export * from './akash/market/v1beta4/lease_pb.js';
export { Message, type MessageType } from '@bufbuild/protobuf';
`
  writeFileSync(join(generatedDir, 'index.ts'), indexContent)
}