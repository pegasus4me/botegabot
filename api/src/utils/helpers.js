const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

/**
 * Generate a unique agent ID
 */
function generateAgentId() {
    const uuid = uuidv4().replace(/-/g, '').substring(0, 16);
    return `${config.api.agentIdPrefix}${uuid}`;
}

/**
 * Generate a secure API key
 */
function generateApiKey() {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${config.api.keyPrefix}${randomBytes}`;
}

/**
 * Hash an API key for storage
 */
function hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate a unique job ID
 */
function generateJobId() {
    const uuid = uuidv4().replace(/-/g, '').substring(0, 16);
    return `job_${uuid}`;
}

/**
 * Validate Ethereum address format
 */
function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate hash format (0x + 64 hex chars)
 */
function isValidHash(hash) {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

module.exports = {
    generateAgentId,
    generateApiKey,
    hashApiKey,
    generateJobId,
    isValidAddress,
    isValidHash
};
