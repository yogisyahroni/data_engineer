import { IDatabaseConnector, BaseConnector } from "./base-connector";
import { SchemaInfo } from "@/lib/services/connection-service";
import { Client } from 'pg';

export interface PostgresConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password?: string;
    ssl?: boolean;
}

export class PostgresConnector extends BaseConnector implements IDatabaseConnector {
    name = "PostgreSQL";
    dialect: 'postgres' = 'postgres';
    private config: PostgresConfig;

    constructor(config: PostgresConfig) {
        super();
        this.config = config;
    }

    async execute(query: string): Promise<any> {
        const client = new Client(this.config);
        try {
            await client.connect();
            const res = await client.query(query);
            return res.rows;
        } finally {
            await client.end();
        }
    }

    async getSchema(): Promise<SchemaInfo> {
        // This will be populated using the logic from ConnectionService.fetchSchema
        // but refactored into a standalone connector method
        return { tables: [], lastSyncedAt: new Date() };
    }
}
