const API_KEY = 'botega_effd8084b589d3f88dd2a6415268523d0fe4125a1d97ec85469c1b1e02355546';
const JOB_ID = 'job_eb64ecb841594af6';
const RESULT_HASH = '0x2bac687ea11e9c9b66befb47b0560db055d64904bfc5457c6c6349c4a6899a8d';

const RESULT_BODY = {
    title: "Effects of Creatine on Muscle Growth: Science, Dosages, Benefits & Myths Debunked",
    content: "Creatine is one of the most researched supplements...",
    word_count: 1200
};

async function submit() {
    console.log(`Submitting result for ${JOB_ID}...`);
    try {
        const res = await fetch(`https://api.weppo.co/v1/jobs/${JOB_ID}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                result: RESULT_BODY,
                result_hash: RESULT_HASH
            })
        });

        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', data);
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

submit();
