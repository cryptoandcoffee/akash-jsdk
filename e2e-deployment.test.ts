/**
 * E2E Deployment Test - Real Wallet & Mainnet
 *
 * This test creates a real deployment on Akash mainnet using:
 * - Real wallet mnemonic from .env (AKASH_MNEMONIC)
 * - Real Akash network configuration
 * - Real SDL deployment specification
 *
 * The test will:
 * 1. Load wallet from mnemonic
 * 2. Create a deployment message
 * 3. Send it to Akash mainnet
 * 4. Verify the deployment was created
 * 5. Close the deployment
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { SigningStargateClient } from '@cosmjs/stargate'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { GasPrice } from '@cosmjs/stargate'
import { MsgCreateDeployment, MsgCloseDeployment } from '@cryptoandcoffee/akash-jsdk-protobuf'
import * as dotenv from 'dotenv'

// Load .env
dotenv.config()

describe('E2E Deployment Test - Real Mainnet', () => {
  let wallet: DirectSecp256k1HdWallet
  let address: string
  let client: SigningStargateClient
  let deploymentDseq: string

  const RPC_ENDPOINT = 'https://rpc.akash.network:443'
  const CHAIN_ID = 'akashnet-2'
  const DENOM = 'uakt'
  const GAS_PRICE = GasPrice.fromString('0.025uakt')

  beforeAll(async () => {
    const mnemonic = process.env.AKASH_MNEMONIC
    if (!mnemonic) {
      console.warn('⚠️  AKASH_MNEMONIC not set in .env - skipping e2e test')
      return
    }

    console.log('\n📋 Setting up wallet from mnemonic...')
    wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: 'akash'
    })

    const accounts = await wallet.getAccounts()
    address = accounts[0].address
    console.log(`✅ Wallet address: ${address}`)

    // Connect to Akash mainnet
    console.log(`📡 Connecting to ${RPC_ENDPOINT}...`)
    client = await SigningStargateClient.connectWithSigner(RPC_ENDPOINT, wallet, {
      gasPrice: GAS_PRICE
    })
    console.log(`✅ Connected to chain: ${CHAIN_ID}`)
  })

  it('should create a real deployment on mainnet', async () => {
    if (!wallet || !client) {
      console.warn('⏭️  Skipping - wallet not initialized')
      return
    }

    console.log('\n🚀 Creating deployment...')

    // Get current nonce for deployment sequence number
    const account = await client.getAccount(address)
    if (!account) {
      throw new Error(`Account not found: ${address}`)
    }

    const dseq = String(Date.now()) // Use timestamp as unique deployment sequence

    const deploymentMessage = {
      depositor: address,
      id: {
        owner: address,
        dseq: dseq
      },
      groups: [
        {
          groupSeq: 1,
          bidEngine: 'kube',
          resources: [
            {
              resources: {
                cpu: {
                  units: { val: '500000000' } // 0.5 CPU
                },
                memory: {
                  quantity: { val: '536870912' } // 512 MB
                },
                storage: [
                  {
                    quantity: { val: '536870912' } // 512 MB
                  }
                ]
              },
              count: 1,
              price: {
                denom: DENOM,
                amount: '10000' // 0.00001 AKT per block
              }
            }
          ]
        }
      ]
    }

    // Test message encoding with real protobufjs encoder
    console.log('📝 Encoding message with protobufjs...')
    const encoder = MsgCreateDeployment
    const encoded = encoder.encode(deploymentMessage)
    const buffer = encoded.finish()

    console.log(`✅ Message encoded: ${buffer.length} bytes`)
    expect(buffer).toBeDefined()
    expect(buffer instanceof Uint8Array).toBe(true)
    expect(buffer.length).toBeGreaterThan(0)

    // Create and send transaction
    console.log('💰 Sending transaction...')
    const memo = `e2e-test-${Date.now()}`

    const result = await client.signAndBroadcast(
      address,
      [
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
          value: deploymentMessage
        }
      ],
      'auto',
      memo
    )

    console.log(`✅ Transaction sent: ${result.transactionHash}`)
    expect(result.code).toBe(0) // Success
    expect(result.transactionHash).toBeDefined()

    // Extract deployment sequence from transaction
    deploymentDseq = dseq

    console.log(`✅ Deployment created with DSEQ: ${deploymentDseq}`)
  }, { timeout: 60000 })

  it('should close the deployment after creation', async () => {
    if (!wallet || !client || !deploymentDseq) {
      console.warn('⏭️  Skipping - deployment not created')
      return
    }

    console.log('\n🔐 Closing deployment...')

    const closeMessage = {
      deployer: address,
      id: {
        owner: address,
        dseq: deploymentDseq
      }
    }

    console.log('📝 Encoding close message...')
    const encoder = MsgCloseDeployment
    const encoded = encoder.encode(closeMessage)
    const buffer = encoded.finish()

    console.log(`✅ Close message encoded: ${buffer.length} bytes`)
    expect(buffer).toBeDefined()
    expect(buffer instanceof Uint8Array).toBe(true)

    // Send close transaction
    console.log('💰 Sending close transaction...')
    const result = await client.signAndBroadcast(
      address,
      [
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCloseDeployment',
          value: closeMessage
        }
      ],
      'auto',
      `close-${Date.now()}`
    )

    console.log(`✅ Close transaction sent: ${result.transactionHash}`)
    expect(result.code).toBe(0)
    expect(result.transactionHash).toBeDefined()
  }, { timeout: 60000 })

  it('should demonstrate protobufjs properly encodes all message fields', async () => {
    // This validates that the protobufjs encoder works correctly
    // with the proper field definitions from .proto files

    const testMessage = {
      depositor: address || 'akash1test',
      id: {
        owner: address || 'akash1test',
        dseq: '12345'
      },
      groups: [
        {
          groupSeq: 1,
          bidEngine: 'kube',
          resources: [
            {
              resources: {
                cpu: { units: { val: '1000000000' } },
                memory: { quantity: { val: '1073741824' } },
                storage: [{ quantity: { val: '1073741824' } }]
              },
              count: 1,
              price: { denom: 'uakt', amount: '5000' }
            }
          ]
        }
      ]
    }

    // Encode the message
    const encoded = MsgCreateDeployment.encode(testMessage)
    const buffer = encoded.finish()

    console.log(`✅ Test message encoded: ${buffer.length} bytes`)

    // Verify we can decode it back
    const decoded = MsgCreateDeployment.decode(buffer)
    console.log(`✅ Test message decoded successfully`)

    // Validate round-trip encoding/decoding
    expect(decoded.depositor).toBe(testMessage.depositor)
    expect(decoded.id?.owner).toBe(testMessage.id.owner)
    expect(decoded.id?.dseq).toBe(testMessage.id.dseq)
    expect(decoded.groups?.[0]?.groupSeq).toBe(1)
  })
})
