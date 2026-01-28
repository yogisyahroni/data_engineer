
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:1234@localhost:5432/Inside_engineer1?schema=public";

async function fixPassword() {
    const client = new Client({ connectionString });
    await client.connect();

    console.log('Updating password for Big Data connection...');
    await client.query(`
    UPDATE "Connection" 
    SET password = '1234' 
    WHERE name = 'Big Data (1M Rows)'
  `);

    console.log('✅ Password updated.');
    await client.end();
}

fixPassword();
