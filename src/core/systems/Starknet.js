import { System } from './System'
import EventEmitter from 'eventemitter3'

/**
 * Starknet System
 * 
 * Provides Starknet blockchain functionality to the Hyperfy engine
 * Similar to drama-haus EVM integration but for Starknet
 * 
 * Features:
 * - Wallet connection management
 * - Smart contract interactions
 * - Transaction handling
 * - Event listening
 */
export class Starknet extends System {
	constructor(world) {
		super(world)
		this.provider = null
		this.account = null
		this.connected = false
		this.chainId = null
		this.events = new EventEmitter()

		// Contract instances cache
		this.contracts = new Map()

		// Transaction queue for better UX
		this.txQueue = []
		this.processing = false
	}

	async init(options) {
		// Initialize Starknet provider if available
		this.initProvider()

		// Listen for wallet connection events from apps
		this.world.on('walletConnected', this.handleWalletConnected.bind(this))
		this.world.on('walletDisconnected', this.handleWalletDisconnected.bind(this))
	}

	initProvider() {
		if (typeof window !== 'undefined') {
			// Check for Starknet wallet
			if (window.starknet) {
				this.provider = window.starknet
				console.log('[Starknet] Provider detected:', this.provider.name || 'Unknown')
			} else {
				console.log('[Starknet] No wallet provider detected')
			}
		}
	}

	async handleWalletConnected(walletState) {
		if (walletState.walletName && walletState.provider && walletState.address) {
			this.provider = walletState.provider
			this.account = {
				address: walletState.address,
				provider: walletState.provider
			}
			this.connected = true
			this.chainId = walletState.chainId

			console.log('[Starknet] Wallet connected:', {
				address: this.account.address,
				chainId: this.chainId
			})

			this.events.emit('connected', this.account)
		}
	}

	handleWalletDisconnected() {
		this.provider = null
		this.account = null
		this.connected = false
		this.chainId = null
		this.contracts.clear()

		console.log('[Starknet] Wallet disconnected')
		this.events.emit('disconnected')
	}

	/**
	 * Get or create a contract instance
	 */
	getContract(address, abi) {
		const key = `${address}_${JSON.stringify(abi).slice(0, 100)}`

		if (this.contracts.has(key)) {
			return this.contracts.get(key)
		}

		if (!this.provider) {
			throw new Error('No Starknet provider available')
		}

		// Create contract instance
		const contract = {
			address,
			abi,
			provider: this.provider,

			// Call read-only function
			async call(functionName, calldata = []) {
				try {
					const result = await this.provider.request({
						type: 'starknet_call',
						params: {
							contract_address: address,
							entry_point_selector: functionName,
							calldata: calldata
						}
					})
					return result
				} catch (error) {
					console.error('[Starknet] Contract call failed:', error)
					throw error
				}
			},

			// Execute state-changing function
			async invoke(functionName, calldata = [], options = {}) {
				if (!this.account) {
					throw new Error('No account connected')
				}

				try {
					const transaction = {
						type: 'INVOKE_FUNCTION',
						contract_address: address,
						entry_point_selector: functionName,
						calldata: calldata,
						...options
					}

					const result = await this.provider.request({
						type: 'starknet_addInvokeTransaction',
						params: transaction
					})

					return result
				} catch (error) {
					console.error('[Starknet] Contract invocation failed:', error)
					throw error
				}
			}
		}

		this.contracts.set(key, contract)
		return contract
	}

	/**
	 * Send a transaction
	 */
	async sendTransaction(transaction) {
		if (!this.connected || !this.account) {
			throw new Error('Wallet not connected')
		}

		try {
			const result = await this.provider.request({
				type: 'starknet_addInvokeTransaction',
				params: transaction
			})

			// Add to transaction queue for tracking
			this.txQueue.push({
				hash: result.transaction_hash,
				timestamp: Date.now(),
				status: 'pending'
			})

			return result
		} catch (error) {
			console.error('[Starknet] Transaction failed:', error)
			throw error
		}
	}

	/**
	 * Get transaction status
	 */
	async getTransactionStatus(txHash) {
		if (!this.provider) {
			throw new Error('No provider available')
		}

		try {
			const result = await this.provider.request({
				type: 'starknet_getTransactionStatus',
				params: { transaction_hash: txHash }
			})
			return result
		} catch (error) {
			console.error('[Starknet] Failed to get transaction status:', error)
			throw error
		}
	}

	/**
	 * Get account balance
	 */
	async getBalance(tokenAddress = null) {
		if (!this.account) {
			throw new Error('No account connected')
		}

		try {
			// Default to STRK token if no address provided
			const contractAddress = tokenAddress || '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'

			const result = await this.provider.request({
				type: 'starknet_call',
				params: {
					contract_address: contractAddress,
					entry_point_selector: 'balanceOf',
					calldata: [this.account.address]
				}
			})

			return result
		} catch (error) {
			console.error('[Starknet] Failed to get balance:', error)
			throw error
		}
	}

	/**
	 * Sign a message
	 */
	async signMessage(message) {
		if (!this.connected || !this.account) {
			throw new Error('Wallet not connected')
		}

		try {
			const result = await this.provider.request({
				type: 'starknet_signMessage',
				params: {
					message: message
				}
			})
			return result
		} catch (error) {
			console.error('[Starknet] Message signing failed:', error)
			throw error
		}
	}

	/**
	 * Add event listener
	 */
	on(event, callback) {
		this.events.on(event, callback)
	}

	/**
	 * Remove event listener
	 */
	off(event, callback) {
		this.events.off(event, callback)
	}

	/**
	 * Check if wallet is connected
	 */
	isConnected() {
		return this.connected && this.account !== null
	}

	/**
	 * Get current account info
	 */
	getAccount() {
		return this.account
	}

	/**
	 * Get current chain ID
	 */
	getChainId() {
		return this.chainId
	}
}
