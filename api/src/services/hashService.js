const crypto = require('crypto');

/**
 * Generate deterministic hash from result object
 * Uses canonical JSON (sorted keys) for consistency
 */
/**
 * Deep sort object keys for deterministic JSON
 */
function deepSort(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(deepSort);
    }

    const sortedObj = {};
    Object.keys(obj).sort().forEach(key => {
        sortedObj[key] = deepSort(obj[key]);
    });
    return sortedObj;
}

function generateHash(result) {
    // Convert to canonical JSON (recursive sorted keys)
    const sorted = deepSort(result);
    const canonical = JSON.stringify(sorted);

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
