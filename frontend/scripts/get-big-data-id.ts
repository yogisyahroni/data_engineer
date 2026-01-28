
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:1234@localhost:5432/Inside_engineer1?schema=public";

async function getConnectionId() {
    const client = new Client({ connectionString });
    await client.connect();
    const res = await client.query(`SELECT id FROM "Connection" WHERE name = $1`, ['Big Data (1M Rows)']);
    if (res.rows.length > 0) {
        console.log(`CONNECTION_ID:${res.rows[0].id}`);
    } else {
        console.error('Connection not found');
    }
    await client.end();
}

getConnectionId();
