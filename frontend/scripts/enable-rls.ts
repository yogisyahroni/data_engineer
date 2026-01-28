
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:1234@localhost:5432/Inside_engineer1?schema=public";

async function enableRLS() {
    const client = new Client({ connectionString });
    console.log('🛡️ Enabling RLS on big_sales...');

    try {
        await client.connect();

        // 1. Enable RLS
        await client.query(`ALTER TABLE big_sales ENABLE ROW LEVEL SECURITY;`);
        console.log('- RLS Enabled.');

        // 2. Create Policy
        // Policy: Users can only see rows where customer_segment matches the session variable 'app.current_segment'
        // If 'app.current_segment' is null/not set, they see NOTHING (default deny).
        // EXCEPT: If 'app.current_segment' is 'ALL', they see everything (Admin mode).

        await client.query(`DROP POLICY IF EXISTS sales_segment_isolation ON big_sales;`);

        await client.query(`
      CREATE POLICY sales_segment_isolation ON big_sales
      FOR SELECT
      USING (
        current_setting('app.current_segment', true) = 'ALL' 
        OR 
        customer_segment = current_setting('app.current_segment', true)
      );
    `);
        console.log('- Policy "sales_segment_isolation" created.');

        // 3. Force RLS for table owner too (optional but good for testing)
        await client.query(`ALTER TABLE big_sales FORCE ROW LEVEL SECURITY;`);

    } catch (err) {
        console.error('❌ Error enabling RLS:', err);
    } finally {
        await client.end();
        console.log('✅ Done.');
    }
}

enableRLS();
