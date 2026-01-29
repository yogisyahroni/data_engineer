
// const fetch = require('node-fetch'); // Use global fetch in Node 18+

async function testAggregation() {
    const response = await fetch('http://localhost:3000/api/engine/aggregate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            connectionId: 'db1', // Assuming db1 exists
            table: 'orders', // Assuming 'orders' table exists from seed
            dimensions: ['status'],
            metrics: [{ column: 'amount', type: 'sum' }, { column: '*', type: 'count' }],
            limit: 10
        })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Result:', JSON.stringify(data, null, 2));
}

testAggregation();
