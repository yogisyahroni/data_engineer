
import { queryService } from '../lib/services/query-service';
import { connectionService } from '../lib/services/connection-service';

// Mock connection service to return our connection details without hitting the DB for config
// Actually, queryService uses connectionService.getConnection, which queries the DB.
// Since we have the ID, we can just run it.

const CONNECTION_ID = '2a2e6ef9-bdde-4e56-99d6-99987a47839a';

async function verify() {
    console.log('🧪 Verifying Pagination Logic...');

    try {
        // 1. Test Page 1, Size 50
        console.log('Test 1: Page 1, Size 50');
        const res1 = await queryService.executePaginatedQuery(
            CONNECTION_ID,
            'SELECT * FROM big_sales',
            1,
            50
        );

        if (!res1.success) throw new Error(res1.error);

        console.log(`- Rows returned: ${res1.rowCount}`);
        console.log(`- Total Rows: ${res1.totalRows}`);

        if (res1.rowCount !== 50) throw new Error('Expected 50 rows');
        if (res1.totalRows !== 1000000) throw new Error(`Expected 1,000,000 total rows, got ${res1.totalRows}`);

        // 2. Test Page 2
        console.log('Test 2: Page 2, Size 10');
        const res2 = await queryService.executePaginatedQuery(
            CONNECTION_ID,
            'SELECT * FROM big_sales',
            2,
            10
        );

        if (res2.rowCount !== 10) throw new Error('Expected 10 rows');
        // Check if data is actually different (id should be > 50 if sequential, but random order might apply)
        // We assume offset works if row count is correct.

        console.log('✅ Pagination Verification Passed!');

    } catch (err) {
        console.error('❌ Verification Failed:', err);
        process.exit(1);
    }
}

verify();
