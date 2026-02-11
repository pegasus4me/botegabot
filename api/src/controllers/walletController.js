const blockchainService = require('../services/blockchainService');
const walletService = require('../services/walletService');
const transactionService = require('../services/transactionService');
const { isValidAddress } = require('../utils/helpers');
const db = require('../config/database');

/**
 * Get wallet balance
 */
async function getBalance(req, res) {
    try {
        // Get agent's wallet address
        const agentResult = await db.query(
            'SELECT wallet_address FROM agents WHERE agent_id = $1',
            [req.agentId]
        );

        if (agentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        const walletAddress = agentResult.rows[0].wallet_address;

        // Get MON balance from blockchain
        const monBalance = await blockchainService.getMonBalance(walletAddress);

        // Calculate staked collateral (sum of accepted jobs)
        const collateralResult = await db.query(
            `SELECT SUM(collateral_required) as total_collateral
        FROM jobs
        WHERE executor_id = $1 AND status = 'accepted'`,
            [req.agentId]
        );

        const collateralStaked = collateralResult.rows[0].total_collateral || '0';
        const availableBalance = (parseFloat(monBalance) - parseFloat(collateralStaked)).toFixed(6);

        res.json({
            wallet_address: walletAddress,
            mon_balance: monBalance,
            collateral_staked: collateralStaked,
            available_balance: availableBalance
        });

    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ error: 'Failed to get balance' });
    }
}

/**
 * Export wallet for user withdrawal
 */
async function exportWallet(req, res) {
    try {
        const wallet = await walletService.exportWallet(req.agentId);

        res.json({
            wallet_address: wallet.wallet_address,
            private_key: wallet.private_key,
            mnemonic: wallet.mnemonic,
            warning: '⚠️ CRITICAL: Save these credentials securely. Anyone with access can control your funds!',
            instructions: [
                '1. Import mnemonic or private key into MetaMask',
                '2. You now have full control of your wallet',
                '3. You can withdraw MON to any address',
                '4. Keep these credentials safe - they cannot be recovered if lost'
            ]
        });

    } catch (error) {
        console.error('Export wallet error:', error);
        res.status(500).json({ error: 'Failed to export wallet' });
    }
}

/**
 * Withdraw funds to external address
 */
async function withdraw(req, res) {
    try {
        const { to_address, amount } = req.body;

        // Validation
        if (!to_address || !amount) {
            return res.status(400).json({ error: 'Missing required fields: to_address, amount' });
        }

        if (!isValidAddress(to_address)) {
            return res.status(400).json({ error: 'Invalid destination address' });
        }

        if (parseFloat(amount) <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }

        // Get agent's wallet
        const agentResult = await db.query(
            'SELECT wallet_address FROM agents WHERE agent_id = $1',
            [req.agentId]
        );

        if (agentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        const walletAddress = agentResult.rows[0].wallet_address;

        // Check balance
        const monBalance = await blockchainService.getMonBalance(walletAddress);

        if (parseFloat(monBalance) < parseFloat(amount)) {
            return res.status(400).json({
                error: 'Insufficient balance',
                available: monBalance,
                requested: amount
            });
        }

        // Get signer and send native MON
        const signer = await walletService.getAgentSigner(req.agentId, blockchainService.provider);

        const { ethers } = require('ethers');
        const amountWei = ethers.parseEther(amount.toString());

        console.log(`💸 Withdrawing ${amount} MON from ${walletAddress} to ${to_address}...`);

        const tx = await signer.sendTransaction({
            to: to_address,
            value: amountWei
        });

        // Record transaction
        await transactionService.recordTransaction(tx.hash, req.agentId, 'withdraw', {
            to_address,
            amount: amount.toString()
        });

        // Wait for confirmation (async)
        transactionService.waitForConfirmation(tx, req.agentId, 'withdraw')
            .then(() => console.log(`✅ Withdrawal confirmed: ${tx.hash}`))
            .catch(err => console.error(`❌ Withdrawal failed:`, err));

        res.json({
            message: 'Withdrawal initiated',
            tx_hash: tx.hash,
            to_address,
            amount,
            status: 'pending',
            note: 'Transaction is being processed on-chain. Check status with tx_hash.'
        });

    } catch (error) {
        console.error('Withdraw error:', error);
        res.status(500).json({ error: 'Failed to withdraw funds' });
    }
}

module.exports = {
    getBalance,
    exportWallet,
    withdraw
};
