const crypto = require('crypto');
const { ethers } = require('ethers');
const db = require('../config/database');
const config = require('../config/env');

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

class WalletService {
    constructor() {
        this.encryptionKey = this.deriveKey(config.wallet.encryptionKey);
    }

    /**
     * Derive encryption key from password
     */
    deriveKey(password) {
        if (!password) {
            throw new Error('WALLET_ENCRYPTION_KEY not set in environment');
        }

        // Use a fixed salt for key derivation (in production, use per-wallet salts)
        const salt = crypto.createHash('sha256').update('botegabot-salt').digest();
        return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
    }

    /**
     * Generate a new Ethereum wallet
     */
    generateWallet() {
        const wallet = ethers.Wallet.createRandom();
        return {
            address: wallet.address,
            privateKey: wallet.privateKey,
            mnemonic: wallet.mnemonic?.phrase
        };
    }

    /**
     * Encrypt private key for storage
     */
    encryptPrivateKey(privateKey) {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

        let encrypted = cipher.update(privateKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // Combine iv + encrypted + authTag
        return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
    }

    /**
     * Decrypt private key from storage
     */
    decryptPrivateKey(encryptedData) {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const authTag = Buffer.from(parts[2], 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Save wallet for agent
     */
    async saveAgentWallet(agentId, wallet) {
        try {
            // Encrypt private key
            const encryptedPrivateKey = this.encryptPrivateKey(wallet.privateKey);

            // Save to database
            await db.query(
                'INSERT INTO agent_wallets (agent_id, encrypted_private_key, wallet_address) VALUES ($1, $2, $3)',
                [agentId, encryptedPrivateKey, wallet.address]
            );

            console.log(`✅ Saved wallet for agent ${agentId}: ${wallet.address}`);
            return true;
        } catch (error) {
            console.error('Error saving wallet:', error);
            throw error;
        }
    }

    /**
     * Create and save wallet for agent
     * @deprecated Use generateWallet and saveAgentWallet separately
     */
    async createWalletForAgent(agentId) {
        try {
            // Check if wallet already exists
            const existing = await db.query(
                'SELECT wallet_address FROM agent_wallets WHERE agent_id = $1',
                [agentId]
            );

            if (existing.rows.length > 0) {
                throw new Error('Wallet already exists for this agent');
            }

            // Generate new wallet
            const wallet = this.generateWallet();

            // Save to database
            await this.saveAgentWallet(agentId, wallet);

            return {
                address: wallet.address,
                mnemonic: wallet.mnemonic // Return mnemonic once for backup
            };

        } catch (error) {
            console.error('Error creating wallet:', error);
            throw error;
        }
    }

    /**
     * Get wallet address for agent
     */
    async getWalletAddress(agentId) {
        const result = await db.query(
            'SELECT wallet_address FROM agent_wallets WHERE agent_id = $1',
            [agentId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0].wallet_address;
    }

    /**
     * Get ethers.js signer for agent
     */
    async getAgentSigner(agentId, provider) {
        try {
            const result = await db.query(
                'SELECT encrypted_private_key FROM agent_wallets WHERE agent_id = $1',
                [agentId]
            );

            if (result.rows.length === 0) {
                throw new Error('No wallet found for agent');
            }

            const encryptedPrivateKey = result.rows[0].encrypted_private_key;
            const privateKey = this.decryptPrivateKey(encryptedPrivateKey);

            return new ethers.Wallet(privateKey, provider);

        } catch (error) {
            console.error('Error getting agent signer:', error);
            throw error;
        }
    }

    /**
     * Get wallet info for agent
     */
    async getWalletInfo(agentId) {
        const result = await db.query(
            'SELECT wallet_address, created_at FROM agent_wallets WHERE agent_id = $1',
            [agentId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return {
            address: result.rows[0].wallet_address,
            created_at: result.rows[0].created_at
        };
    }

    /**
     * Verify wallet ownership (for testing)
     */
    async verifyWallet(agentId, provider) {
        try {
            const signer = await this.getAgentSigner(agentId, provider);
            const address = await signer.getAddress();
            const storedAddress = await this.getWalletAddress(agentId);

            return address.toLowerCase() === storedAddress.toLowerCase();
        } catch (error) {
            return false;
        }
    }

    /**
     * Export wallet mnemonic for user withdrawal
     * WARNING: This exposes the private key - only call with proper authentication
     */
    async exportWallet(agentId) {
        try {
            const result = await db.query(
                'SELECT encrypted_private_key, wallet_address FROM agent_wallets WHERE agent_id = $1',
                [agentId]
            );

            if (result.rows.length === 0) {
                throw new Error('No wallet found for agent');
            }

            const encryptedPrivateKey = result.rows[0].encrypted_private_key;
            const walletAddress = result.rows[0].wallet_address;

            // Decrypt private key
            const privateKey = this.decryptPrivateKey(encryptedPrivateKey);

            // Recreate wallet to get mnemonic
            const wallet = new ethers.Wallet(privateKey);

            // Log export for security audit
            console.log(`⚠️  Wallet exported for agent ${agentId} at ${new Date().toISOString()}`);

            return {
                wallet_address: walletAddress,
                private_key: privateKey,
                mnemonic: wallet.mnemonic?.phrase || null
            };

        } catch (error) {
            console.error('Error exporting wallet:', error);
            throw error;
        }
    }
}

// Singleton instance
const walletService = new WalletService();

module.exports = walletService;
