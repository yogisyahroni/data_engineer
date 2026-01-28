
import { queryService } from '../lib/services/query-service';

// Using the same Connection ID, but context will change what we see.
const CONNECTION_ID = '2a2e6ef9-bdde-4e56-99d6-99987a47839a';

async function verifyRLS() {
    console.log('🛡️ Verifying Row-Level Security (RLS)...');

    try {
        // 1. As Consumer Agent
        console.log('Test 1: Context = Consumer');
        const res1 = await queryService.executePaginatedQuery(
            CONNECTION_ID,
            'SELECT count(*) as count FROM big_sales',
            1,
            50,
            { segment: 'Consumer' }
        );
        const count1 = parseInt(res1.data[0].count);
        console.log(`- Consumer sees: ${count1} rows`);
        if (count1 === 0 || count1 === 1000000) throw new Error('RLS Failed: Consumer should see ~33% of rows, not 0 or ALL');

        // 2. As Corporate Agent
        console.log('Test 2: Context = Corporate');
        const res2 = await queryService.executePaginatedQuery(
            CONNECTION_ID,
            'SELECT count(*) as count FROM big_sales',
            1,
            50,
            { segment: 'Corporate' }
        );
        const count2 = parseInt(res2.data[0].count);
        console.log(`- Corporate sees: ${count2} rows`);

        // 3. As Admin (ALL)
        console.log('Test 3: Context = ALL (Admin)');
        const res3 = await queryService.executePaginatedQuery(
            CONNECTION_ID,
            'SELECT count(*) as count FROM big_sales',
            1,
            50,
            { segment: 'ALL' }
        );
        const count3 = parseInt(res3.data[0].count);
        console.log(`- Admin sees: ${count3} rows`);

        if (count3 !== 1000000) throw new Error(`Admin should see 1,000,000 rows, saw ${count3}`);
        if (count1 + count2 > count3) throw new Error('Math mismatch: Parts > Total');

        // 4. No Context (Should see 0)
        console.log('Test 4: No Context (Anonymous)');
        const res4 = await queryService.executePaginatedQuery(
            CONNECTION_ID,
            'SELECT count(*) as count FROM big_sales',
            1,
            50
        );
        const count4 = parseInt(res4.data[0].count);
        console.log(`- Anonymous sees: ${count4} rows`);
        if (count4 !== 0) throw new Error('Security Breach: Anonymous user saw data!');

        console.log('✅ RLS Verification Passed! Data is isolated by segment.');

    } catch (err) {
        console.error('❌ Verification Failed:', err);
        process.exit(1);
    }
}

verifyRLS();
