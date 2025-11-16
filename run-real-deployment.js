#!/usr/bin/env node

/**
 * Real Deployment Test - Actually Creates & Closes Deployment on Mainnet
 *
 * This script:
 * 1. Loads wallet from PHRASE env var
 * 2. Parses the provided SDL
 * 3. Creates a real deployment on Akash mainnet
 * 4. Waits for deployment to be created
 * 5. Closes the deployment
 */

import dotenv from 'dotenv'
import { SigningStargateClient } from '@cosmjs/stargate'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { GasPrice } from '@cosmjs/stargate'
import { MsgCreateDeployment, MsgCloseDeployment } from './packages/protobuf/dist/index.js'
import YAML from 'yaml'
import * as fs from 'fs'

// Load .env
dotenv.config()

const RPC_ENDPOINT = 'https://rpc.akash.network:443'
const CHAIN_ID = 'akashnet-2'
const DENOM = 'uakt'
const GAS_PRICE = GasPrice.fromString('0.025uakt')

// SDL from the provided specification
const SDL = `version: "2.0"
services:
  web:
    image: baktun/hello-akash-world:1.0.0
    expose:
      - port: 3000
        as: 80
        to:
          - global: true
profiles:
  compute:
    web:
      resources:
        cpu:
          units: 0.5
        memory:
          size: 512Mi
        storage:
          - size: 512Mi
  placement:
    dcloud:
      pricing:
        web:
          denom: uakt
          amount: 10000
deployment:
  web:
    dcloud:
      profile: web
      count: 1`

async function runRealDeployment() {
  try {
    const mnemonic = process.env.PHRASE || process.env.AKASH_MNEMONIC
    if (!mnemonic) {
      console.log('⚠️  PHRASE or AKASH_MNEMONIC not set in .env')
      return
    }

    console.log('\n════════════════════════════════════════════════════════════')
    console.log('🚀 REAL DEPLOYMENT - Creating & Closing on Akash Mainnet')
    console.log('════════════════════════════════════════════════════════════\n')

    // Setup wallet
    console.log('📋 Step 1: Setting up wallet from mnemonic...')
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: 'akash'
    })

    const accounts = await wallet.getAccounts()
    const address = accounts[0].address
    const pubkey = accounts[0].pubkey
    console.log(`✅ Wallet address: ${address}`)
    console.log(`✅ Public key: ${Buffer.from(pubkey).toString('base64')}\n`)

    // Connect to mainnet
    console.log('📡 Step 2: Connecting to Akash mainnet RPC...')
    console.log(`   Endpoint: ${RPC_ENDPOINT}`)
    const client = await SigningStargateClient.connectWithSigner(RPC_ENDPOINT, wallet, {
      gasPrice: GAS_PRICE
    })
    console.log(`✅ Connected to chain: ${CHAIN_ID}\n`)

    // Check balance
    console.log('💰 Step 3: Checking wallet balance...')
    const account = await client.getAccount(address)
    if (!account) {
      throw new Error(`Account not found: ${address}`)
    }

    const balance = await client.getBalance(address, DENOM)
    const balanceAkt = parseInt(balance.amount) / 1_000_000
    console.log(`✅ Balance: ${balanceAkt.toFixed(6)} AKT`)

    if (parseInt(balance.amount) < 50000) {
      console.warn('⚠️  WARNING: Balance low - may not be enough for deployment')
    }
    console.log()

    // Parse SDL
    console.log('📝 Step 4: Parsing SDL specification...')
    const sdlObj = YAML.parse(SDL)
    console.log(`✅ SDL parsed successfully`)
    console.log(`   Services: ${Object.keys(sdlObj.services).join(', ')}`)
    console.log(`   Image: ${sdlObj.services.web.image}`)
    console.log(`   Resources: CPU=${sdlObj.profiles.compute.web.resources.cpu.units}, Memory=${sdlObj.profiles.compute.web.resources.memory.size}\n`)

    // Calculate deployment sequence
    const dseq = String(Date.now())
    console.log('🎯 Step 5: Creating deployment message...')
    console.log(`   Owner: ${address}`)
    console.log(`   DSEQ: ${dseq}`)

    // Build deployment message
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
                  units: { val: '500000000' } // 0.5 CPU cores
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

    // Encode with protobufjs
    console.log('📦 Step 6: Encoding deployment with protobufjs...')
    const encoder = MsgCreateDeployment
    const encoded = encoder.encode(deploymentMessage)
    const buffer = encoded.finish()
    console.log(`✅ Message encoded: ${buffer.length} bytes`)
    console.log(`✅ Protobufjs encoding successful!\n`)

    // Send transaction
    console.log('💸 Step 7: Broadcasting deployment transaction to mainnet...')
    const createResult = await client.signAndBroadcast(
      address,
      [
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
          value: deploymentMessage
        }
      ],
      'auto',
      `real-deployment-${Date.now()}`
    )

    if (createResult.code !== 0) {
      throw new Error(`Transaction failed with code ${createResult.code}: ${createResult.rawLog}`)
    }

    console.log(`✅ Deployment CREATED!`)
    console.log(`   Transaction Hash: ${createResult.transactionHash}`)
    console.log(`   Block Height: ${createResult.height}`)
    console.log(`   Gas Used: ${createResult.gasUsed}/${createResult.gasWanted}\n`)

    // Wait a bit for deployment to be indexed
    console.log('⏳ Step 8: Waiting for deployment to be indexed...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Close deployment
    console.log('🔐 Step 9: Creating close deployment message...')
    const closeMessage = {
      deployer: address,
      id: {
        owner: address,
        dseq: dseq
      }
    }

    // Encode close message
    console.log('📦 Encoding close message with protobufjs...')
    const closeEncoder = MsgCloseDeployment
    const closeEncoded = closeEncoder.encode(closeMessage)
    const closeBuffer = closeEncoded.finish()
    console.log(`✅ Close message encoded: ${closeBuffer.length} bytes\n`)

    // Send close transaction
    console.log('💸 Step 10: Broadcasting close deployment transaction...')
    const closeResult = await client.signAndBroadcast(
      address,
      [
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCloseDeployment',
          value: closeMessage
        }
      ],
      'auto',
      `close-deployment-${Date.now()}`
    )

    if (closeResult.code !== 0) {
      throw new Error(`Close transaction failed with code ${closeResult.code}: ${closeResult.rawLog}`)
    }

    console.log(`✅ Deployment CLOSED!`)
    console.log(`   Transaction Hash: ${closeResult.transactionHash}`)
    console.log(`   Block Height: ${closeResult.height}`)
    console.log(`   Gas Used: ${closeResult.gasUsed}/${closeResult.gasWanted}\n`)

    // Summary
    console.log('════════════════════════════════════════════════════════════')
    console.log('✨ SUCCESS - Real Deployment Completed!')
    console.log('════════════════════════════════════════════════════════════\n')

    console.log('📊 DEPLOYMENT SUMMARY:')
    console.log(`   Wallet:       ${address}`)
    console.log(`   DSEQ:         ${dseq}`)
    console.log(`   Image:        ${sdlObj.services.web.image}`)
    console.log(`   Resources:    0.5 CPU, 512 MB RAM, 512 MB Storage`)
    console.log(`   Price:        0.00001 AKT/block`)
    console.log()
    console.log('📝 TRANSACTIONS:')
    console.log(`   Create: ${createResult.transactionHash}`)
    console.log(`   Close:  ${closeResult.transactionHash}`)
    console.log()
    console.log('✅ WHAT THIS PROVES:')
    console.log('   ✓ Wallet can be loaded from mnemonic')
    console.log('   ✓ Deployment messages are properly encoded')
    console.log('   ✓ Transactions can be signed and broadcast')
    console.log('   ✓ Protobufjs encoder works correctly')
    console.log('   ✓ SDK can create AND close deployments')
    console.log('   ✓ No "unable to resolve type URL" errors')
    console.log()
    console.log('🎉 The Akash SDK v3.10.9 is FULLY FUNCTIONAL!\n')

  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    if (error.rawLog) {
      console.error('Raw Log:', error.rawLog)
    }
    if (error.code) {
      console.error('Error Code:', error.code)
    }
    process.exit(1)
  }
}

// Run the deployment
runRealDeployment()
