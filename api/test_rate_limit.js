
async function testRateLimit() {
    const API_URL = 'http://localhost:4000/v1/health';
    console.log(`Testing rate limit on ${API_URL}...`);

    for (let i = 0; i < 10; i++) {
        try {
            const response = await fetch(API_URL);
            console.log(`Request ${i + 1}: Success (Status ${response.status})`);

            if (response.status === 429) {
                const data = await response.json();
                console.log('Response body:', JSON.stringify(data, null, 2));
                console.log('❌ Triggered rate limit! The limit is still too low.');
                return;
            }
        } catch (error) {
            console.log(`Request ${i + 1}: Error`, error.message);
        }
    }
    console.log('✅ Successfully passed 10 requests within limit (expected).');
}

testRateLimit();
