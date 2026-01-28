import { PostgresConnector, PostgresConfig } from "./postgres-connector";

export interface SupabaseConfig extends PostgresConfig {
    projectUrl: string;
    anonKey: string;
}

export class SupabaseConnector extends PostgresConnector {
    override name = "Supabase";
    private supabaseConfig: SupabaseConfig;

    constructor(config: SupabaseConfig) {
        super(config);
        this.supabaseConfig = config;
    }

    /**
     * Supabase specific schema fetching can use the PostgREST API 
     * or the direct Postgres connection. We default to Postgres for DDL accuracy.
     */
}
