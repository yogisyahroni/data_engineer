
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:1234@localhost:5432/Inside_engineer1?schema=public";

async function setupAppUser() {
    const client = new Client({ connectionString });
    console.log('👤 Setting up non-superuser "insight_user"...');

    try {
        await client.connect();

        // 1. Create User
        try {
            await client.query(`CREATE USER insight_user WITH PASSWORD '1234';`);
            console.log('- User "insight_user" created.');
        } catch (e: any) {
            if (e.code === '42710') {
                console.log('- User "insight_user" already exists.');
                await client.query(`ALTER USER insight_user WITH PASSWORD '1234';`);
            } else {
                throw e;
            }
        }

        // 2. Grant Permissions
        await client.query(`GRANT CONNECT ON DATABASE "Inside_engineer1" TO insight_user;`);
        await client.query(`GRANT USAGE ON SCHEMA public TO insight_user;`);
        await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO insight_user;`);
        await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO insight_user;`);

        // Grant RLS-specific permission? No, SELECT is enough.
        // Ensure it is NOT superuser
        await client.query(`ALTER USER insight_user NOSUPERUSER NOBYPASSRLS;`);

        console.log('- Permissions granted and NOBYPASSRLS enforced.');

        // 3. Update the 'Big Data' Connection record to use this new user
        // We need to use the connection ID we found earlier: '2a2e6ef9-bdde-4e56-99d6-99987a47839a'
        // But let's look it up by name to be safe
        await client.query(`
      UPDATE "Connection" 
      SET username = 'insight_user', password = '1234'
      WHERE name = 'Big Data (1M Rows)'
    `);
        console.log('- Connection record updated to use "insight_user".');

    } catch (err) {
        console.error('❌ Error setting up app user:', err);
    } finally {
        await client.end();
        console.log('✅ Done.');
    }
}

setupAppUser();
