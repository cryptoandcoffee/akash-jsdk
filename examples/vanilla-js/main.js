import { AkashSDK } from 'cryptoandcoffee/akash-jsdk-core'

const config = {
  rpcEndpoint: 'https://rpc.akashedge.com:443',
  apiEndpoint: 'https://api.akashedge.com:443',
  chainId: 'akashnet-2',
  gasPrice: '0.025uakt',
  gasAdjustment: 1.5
}

const sdk = new AkashSDK(config)
let isConnected = false

// DOM elements
const statusEl = document.getElementById('status')
const connectBtn = document.getElementById('connect-btn')
const disconnectBtn = document.getElementById('disconnect-btn')
const ownerInput = document.getElementById('owner-input')
const fetchDeploymentsBtn = document.getElementById('fetch-deployments-btn')
const createDeploymentBtn = document.getElementById('create-deployment-btn')
const deploymentsOutput = document.getElementById('deployments-output')
const fetchProvidersBtn = document.getElementById('fetch-providers-btn')
const providersOutput = document.getElementById('providers-output')

// Helper functions
function updateStatus(message, type = 'info') {
  statusEl.textContent = message
  statusEl.className = `status ${type}`
}

function updateButtons() {
  connectBtn.disabled = isConnected
  disconnectBtn.disabled = !isConnected
  fetchDeploymentsBtn.disabled = !isConnected
  createDeploymentBtn.disabled = !isConnected
  fetchProvidersBtn.disabled = !isConnected
}

function displayJSON(element, data) {
  element.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`
}

// Event handlers
connectBtn.addEventListener('click', async () => {
  try {
    updateStatus('Connecting...', 'info')
    await sdk.connect()
    isConnected = true
    updateStatus('Connected to Akash Network', 'success')
    updateButtons()
  } catch (error) {
    updateStatus(`Connection failed: ${error.message}`, 'error')
  }
})

disconnectBtn.addEventListener('click', async () => {
  try {
    await sdk.disconnect()
    isConnected = false
    updateStatus('Disconnected', 'info')
    updateButtons()
    deploymentsOutput.innerHTML = ''
    providersOutput.innerHTML = ''
  } catch (error) {
    updateStatus(`Disconnect failed: ${error.message}`, 'error')
  }
})

fetchDeploymentsBtn.addEventListener('click', async () => {
  const owner = ownerInput.value.trim()
  if (!owner) {
    alert('Please enter an owner address')
    return
  }

  try {
    updateStatus('Fetching deployments...', 'info')
    const deployments = await sdk.deployments.list(owner)
    displayJSON(deploymentsOutput, deployments)
    updateStatus(`Found ${deployments.length} deployments`, 'success')
  } catch (error) {
    updateStatus(`Failed to fetch deployments: ${error.message}`, 'error')
    deploymentsOutput.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`
  }
})

createDeploymentBtn.addEventListener('click', async () => {
  try {
    updateStatus('Creating deployment...', 'info')
    
    const sampleConfig = {
      image: 'nginx:latest',
      expose: [{
        port: 80,
        as: 80,
        proto: 'TCP',
        to: [{ global: true }]
      }],
      resources: {
        cpu: { units: '100m' },
        memory: { size: '128Mi' },
        storage: { size: '1Gi' }
      },
      count: 1
    }
    
    const deploymentId = await sdk.deployments.create(sampleConfig)
    updateStatus(`Deployment created: ${deploymentId}`, 'success')
    
    // Refresh deployments if owner is set
    if (ownerInput.value.trim()) {
      fetchDeploymentsBtn.click()
    }
  } catch (error) {
    updateStatus(`Failed to create deployment: ${error.message}`, 'error')
  }
})

fetchProvidersBtn.addEventListener('click', async () => {
  try {
    updateStatus('Fetching providers...', 'info')
    const providers = await sdk.providers.list()
    displayJSON(providersOutput, providers)
    updateStatus(`Found ${providers.length} providers`, 'success')
  } catch (error) {
    updateStatus(`Failed to fetch providers: ${error.message}`, 'error')
    providersOutput.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`
  }
})

// Initialize
updateButtons()
updateStatus('Ready to connect', 'info')