const axios = require('axios');

async function verifySequences() {
    console.log('--- Document Sequence Verification Start ---');
    
    // Define the sequence types to test
    const types = ['PO', 'PROJ', 'DO', 'QUOTE', 'INV', 'GRN'];

    for (const type of types) {
        console.log(`\nTesting type: ${type}`);
        
        try {
            // 1. Get current sequence number without consuming
            const res1 = await axios.post('http://localhost:3000/api/sequences', { type, consume: false });
            const num1 = res1.data.number;
            console.log(`  Current number: ${num1}`);
            
            // 2. Get next sequence number with consuming
            const res2 = await axios.post('http://localhost:3000/api/sequences', { type, consume: true });
            const num2 = res2.data.number;
            console.log(`  Consumed number: ${num2}`);
            
            if (num1 !== num2) {
                console.error(`  FAIL: Number changed when consume=false!`);
            } else {
                console.log(`  PASS: Number matches when fetching again!`);
            }
            
            // 3. Get next sequence number again to verify increment
            const res3 = await axios.post('http://localhost:3000/api/sequences', { type, consume: false });
            const num3 = res3.data.number;
            console.log(`  Next available (after consume): ${num3}`);
            
            // Extract the numeric part (XXXX) from PREFIX-YYMM-XXXX
            const getVal = (n) => parseInt(n.split('-').pop());
            if (getVal(num3) === getVal(num2) + 1) {
                console.log(`  PASS: Sequential increment verified.`);
            } else {
                console.error(`  FAIL: Increment failed. Expected ${getVal(num2) + 1}, got ${getVal(num3)}`);
            }
            
        } catch (error) {
            console.error(`  ERROR testing ${type}:`, error.response?.data || error.message);
        }
    }
    
    console.log('\n--- Document Sequence Verification End ---');
}

// Note: This script assumes the server is running on localhost:3000
// and that auth is bypassed or handled (for internal script use, we might need a bypass or use lib directly)
// Since I can't easily run a server-side script that hits local routes with auth easily without more setup,
// I will verify conceptually and look at the code logic which is now centralized.

// However, I can check if I can run it via a simple node command if the environment allows.
// Let's try to run a mock version that uses the lib directly if I can setup a test harness.
verifySequences();
