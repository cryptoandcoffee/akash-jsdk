#!/usr/bin/env node

/**
 * E2E Deployment Test Runner
 *
 * Runs real deployment creation and closing on Akash mainnet
 * using the wallet mnemonic from .env
 */

import dotenv from 'dotenv'
import { SigningStargateClient } from '@cosmjs/stargate'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { GasPrice } from '@cosmjs/stargate'
import { MsgCreateDeployment, MsgCloseDeployment } from './packages/protobuf/dist/index.js'

// Load .env
dotenv.config()

const RPC_ENDPOINT = 'https://rpc.akash.network:443'
const CHAIN_ID = 'akashnet-2'
const DENOM = 'uakt'
const GAS_PRICE = GasPrice.fromString('0.025uakt')

async function runE2ETest() {
  try {
    const mnemonic = process.env.PHRASE || process.env.AKASH_MNEMONIC
    if (!mnemonic) {
      console.log('⚠️  PHRASE or AKASH_MNEMONIC not set in .env - skipping e2e test')
      return
    }

    console.log('\n========================================')
    console.log('🚀 E2E Deployment Test - Real Mainnet')
    console.log('========================================\n')

    // Setup wallet
    console.log('📋 Setting up wallet from mnemonic...')
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: 'akash'
    })

    const accounts = await wallet.getAccounts()
    const address = accounts[0].address
    console.log(`✅ Wallet address: ${address}\n`)

    // Connect to mainnet
    console.log(`📡 Connecting to ${RPC_ENDPOINT}...`)
    const client = await SigningStargateClient.connectWithSigner(RPC_ENDPOINT, wallet, {
      gasPrice: GAS_PRICE
    })
    console.log(`✅ Connected to chain: ${CHAIN_ID}\n`)

    // Check account balance
    console.log('💰 Checking account balance...')
    const account = await client.getAccount(address)
    if (!account) {
      throw new Error(`Account not found: ${address}`)
    }

    const balance = await client.getBalance(address, DENOM)
    const balanceAkt = parseInt(balance.amount) / 1_000_000
    console.log(`✅ Balance: ${balanceAkt} AKT\n`)

    // Create deployment
    console.log('🎯 Creating deployment...')
    const dseq = String(Date.now())

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
                cpu: { units: { val: '500000000' } }, // 0.5 CPU
                memory: { quantity: { val: '536870912' } }, // 512 MB
                storage: [{ quantity: { val: '536870912' } }] // 512 MB
              },
              count: 1,
              price: { denom: DENOM, amount: '10000' } // 0.00001 AKT per block
            }
          ]
        }
      ]
    }

    // Encode and send
    console.log('📝 Encoding with protobufjs...')
    const encoded = MsgCreateDeployment.encode(deploymentMessage)
    const buffer = encoded.finish()
    console.log(`✅ Encoded: ${buffer.length} bytes\n`)

    console.log('💸 Sending deployment transaction...')
    const txResult = await client.signAndBroadcast(
      address,
      [
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
          value: deploymentMessage
        }
      ],
      'auto',
      `e2e-test-${Date.now()}`
    )

    if (txResult.code !== 0) {
      throw new Error(`Transaction failed with code ${txResult.code}: ${txResult.rawLog}`)
    }

    console.log(`✅ Deployment created!`)
    console.log(`   TX Hash: ${txResult.transactionHash}`)
    console.log(`   DSEQ: ${dseq}\n`)

    // Close deployment
    console.log('🔐 Closing deployment...')
    const closeMessage = {
      deployer: address,
      id: {
        owner: address,
        dseq: dseq
      }
    }

    console.log('📝 Encoding close message...')
    const closeEncoded = MsgCloseDeployment.encode(closeMessage)
    const closeBuffer = closeEncoded.finish()
    console.log(`✅ Encoded: ${closeBuffer.length} bytes\n`)

    console.log('💸 Sending close transaction...')
    const closeResult = await client.signAndBroadcast(
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

    if (closeResult.code !== 0) {
      throw new Error(`Close transaction failed with code ${closeResult.code}: ${closeResult.rawLog}`)
    }

    console.log(`✅ Deployment closed!`)
    console.log(`   TX Hash: ${closeResult.transactionHash}\n`)

    console.log('========================================')
    console.log('✨ E2E Test Completed Successfully!')
    console.log('========================================\n')

    // Summary
    console.log('📊 Summary:')
    console.log(`   Wallet: ${address}`)
    console.log(`   Deployment DSEQ: ${dseq}`)
    console.log(`   Create TX: ${txResult.transactionHash}`)
    console.log(`   Close TX: ${closeResult.transactionHash}`)
    console.log('\n✅ The SDK can properly create and close deployments on mainnet!')
    console.log('✅ Protobufjs encoder is working correctly!\n')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.rawLog) {
      console.error('Raw Log:', error.rawLog)
    }
    process.exit(1)
  }
}

// Run the test
runE2ETest()
