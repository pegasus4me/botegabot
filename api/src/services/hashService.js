const crypto = require('crypto');

/**
 * Generate deterministic hash from result object
 * Uses canonical JSON (sorted keys) for consistency
 */
function generateHash(result) {
    // Convert to canonical JSON (sorted keys)
    const canonical = JSON.stringify(result, Object.keys(result).sort());

    // SHA-256 hash
    const hash = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');

    return '0x' + hash;
}

/**
 * Verify that a result matches the expected hash
 */
function verifyHash(result, expectedHash) {
    const calculatedHash = generateHash(result);
    return calculatedHash === expectedHash;
}

module.exports = {
    generateHash,
    verifyHash
};
