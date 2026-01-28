
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:1234@localhost:5432/Inside_engineer1?schema=public";

async function seedBigData() {
    console.log('🚀 Starting Big Data Seeding (1M Rows)...');

    const client = new Client({
        connectionString,
    });

    try {
        await client.connect();

        // 1. Create table if not exists
        console.log('Creating table big_sales...');
        await client.query(`
      DROP TABLE IF EXISTS big_sales;
      CREATE TABLE big_sales (
        id SERIAL PRIMARY KEY,
        order_date DATE,
        region VARCHAR(50),
        product_category VARCHAR(50),
        product_name VARCHAR(100),
        quantity INTEGER,
        unit_price DECIMAL(10, 2),
        total_amount DECIMAL(12, 2),
        customer_segment VARCHAR(50)
      );
    `);

        // 2. Generate data in Javascript and batch insert via COPY (fastest way)
        // Actually, generating 1M rows in JS might be slow. Let's use `generate_series` in SQL directly.
        // It's much faster and cleaner.

        console.log('Generating 1,000,000 rows via SQL...');

        const startTime = Date.now();

        await client.query(`
      INSERT INTO big_sales (
        order_date, 
        region, 
        product_category, 
        product_name, 
        quantity, 
        unit_price, 
        total_amount, 
        customer_segment
      )
      SELECT
        timestamp '2023-01-01' + random() * (timestamp '2023-12-31' - timestamp '2023-01-01') as order_date,
        (ARRAY['North', 'South', 'East', 'West'])[floor(random() * 4 + 1)] as region,
        (ARRAY['Electronics', 'Furniture', 'Clothing', 'Books'])[floor(random() * 4 + 1)] as product_category,
        'Product ' || floor(random() * 1000 + 1) as product_name,
        floor(random() * 50 + 1)::int as quantity,
        (random() * 1000)::numeric(10,2) as unit_price,
        0 as total_amount, -- Will calculate later or just use random
        (ARRAY['Consumer', 'Corporate', 'Home Office'])[floor(random() * 3 + 1)] as customer_segment
      FROM generate_series(1, 1000000);
    `);

        // Update total_amount
        await client.query(`UPDATE big_sales SET total_amount = quantity * unit_price;`);

        const duration = (Date.now() - startTime) / 1000;
        console.log(`✅ 1 Million rows inserted in ${duration} seconds.`);

        // 3. Create Connection record for UI to access it
        // We need a userId. Let's pick the first user or 'user_123' if hardcoded.
        // Ensure Connection table has this entry.
        console.log('Ensuring connection for UI...');

        const userId = 'user_123'; // Matches our hardcoded mock user

        // Check if user exists, if not create
        const userRes = await client.query(`SELECT id FROM "User" WHERE id = $1`, [userId]);
        if (userRes.rowCount === 0) {
            await client.query(`
         INSERT INTO "User" (id, email, name, password, "updatedAt")
         VALUES ($1, 'demo@example.com', 'Demo User', 'password', NOW())
       `, [userId]);
        }

        const connName = 'Big Data (1M Rows)';
        // Check if connection exists
        const connRes = await client.query(`SELECT id FROM "Connection" WHERE name = $1 AND "userId" = $2`, [connName, userId]);

        if (connRes.rowCount === 0) {
            await client.query(`
        INSERT INTO "Connection" (id, name, type, database, "userId", "isActive", "updatedAt")
        VALUES (gen_random_uuid(), $1, 'postgres', 'Inside_engineer1', $2, true, NOW())
      `, [connName, userId]);
            console.log('✅ Created "Big Data" connection in UI.');
        } else {
            console.log('ℹ️ "Big Data" connection already exists.');
        }

    } catch (err) {
        console.error('Error seeding big data:', err);
    } finally {
        await client.end();
        console.log('🚀 Done.');
    }
}

seedBigData();
