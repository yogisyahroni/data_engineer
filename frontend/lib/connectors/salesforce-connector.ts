import { BaseConnector, ConnectionConfig, SchemaInfo, QueryResult } from './base-connector';

/**
 * Salesforce Connector Implementation
 * Connects to Salesforce REST API and SOQL
 * 
 * Uses jsforce library for Salesforce integration
 */
export class SalesforceConnector extends BaseConnector {
    private conn: any; // jsforce Connection object

    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            // Lazy load jsforce
            const jsforce = await import('jsforce');

            // Create connection
            this.conn = new jsforce.Connection({
                loginUrl: this.config.extraConfig?.loginUrl || 'https://login.salesforce.com',
                version: this.config.extraConfig?.apiVersion || '58.0',
            });

            // Login with username + password + security token
            if (this.config.username && this.config.password) {
                await this.conn.login(this.config.username, this.config.password);
            }
            // OR login with OAuth token
            else if (this.config.authToken) {
                this.conn.accessToken = this.config.authToken;
                this.conn.instanceUrl = this.config.extraConfig?.instanceUrl;
            } else {
                return {
                    success: false,
                    error: 'Either username/password or auth token is required for Salesforce',
                };
            }

            // Test query
            const result = await this.conn.query('SELECT Id FROM User LIMIT 1');

            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: `Salesforce connection failed: ${error.message}`,
            };
        }
    }

    async fetchSchema(): Promise<SchemaInfo> {
        if (!this.conn) {
            throw new Error('Not connected. Call testConnection() first.');
        }

        const schemaInfo: SchemaInfo = { tables: [] };

        // Get all SObjects (Salesforce objects = tables)
        const describeResult = await this.conn.describeGlobal();
        const sobjects = describeResult.sobjects || [];

        // Filter to common objects (to avoid overwhelming response)
        const commonObjects = this.config.extraConfig?.objects || [
            'Account',
            'Contact',
            'Lead',
            'Opportunity',
            'Case',
            'Task',
            'Event',
            'User',
        ];

        for (const sobject of sobjects) {
            if (!commonObjects.includes(sobject.name)) continue;

            // Get detailed metadata for each object
            const metadata = await this.conn.sobject(sobject.name).describe();

            const columns = (metadata.fields || []).map((field: any) => {
                let sqlType = 'TEXT';

                switch (field.type) {
                    case 'int':
                    case 'double':
                        sqlType = 'INTEGER';
                        break;
                    case 'currency':
                    case 'percent':
                        sqlType = 'REAL';
                        break;
                    case 'boolean':
                        sqlType = 'BOOLEAN';
                        break;
                    case 'date':
                    case 'datetime':
                        sqlType = 'TIMESTAMP';
                        break;
                    default:
                        sqlType = 'TEXT';
                }

                return {
                    name: field.name,
                    type: sqlType,
                    nullable: field.nillable,
                    isPrimary: field.name === 'Id',
                    isForeign: field.referenceTo && field.referenceTo.length > 0,
                    description: field.label,
                };
            });

            schemaInfo.tables.push({
                name: sobject.name,
                schema: 'salesforce',
                rowCount: 0, // Too expensive to count
                columns,
            });
        }

        return schemaInfo;
    }

    async executeQuery(sql: string): Promise<QueryResult> {
        const startTime = Date.now();

        if (!this.conn) {
            throw new Error('Not connected. Call testConnection() first.');
        }

        // Convert SQL to SOQL (Salesforce Object Query Language)
        // This is a simplified conversion - in production, use a proper SQL-to-SOQL translator
        let soql = sql;

        // Basic transformations
        soql = soql.replace(/SELECT \*/gi, 'SELECT Id, Name'); // SOQL doesn't support SELECT *
        soql = soql.replace(/LIMIT (\d+)/gi, 'LIMIT $1');

        // Execute SOQL query
        const result = await this.conn.query(soql);

        const executionTime = Date.now() - startTime;
        const rows = result.records || [];
        const columns = rows.length > 0 ? Object.keys(rows[0]).filter((k) => k !== 'attributes') : [];

        // Remove Salesforce metadata
        const cleanRows = rows.map((row: any) => {
            const { attributes, ...clean } = row;
            return clean;
        });

        return {
            columns,
            rows: cleanRows,
            rowCount: result.totalSize || cleanRows.length,
            executionTime,
        };
    }

    async disconnect(): Promise<void> {
        if (this.conn) {
            await this.conn.logout();
            this.conn = null;
        }
    }

    validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        const hasUserPass = this.config.username && this.config.password;
        const hasOAuth = this.config.authToken && this.config.extraConfig?.instanceUrl;

        if (!hasUserPass && !hasOAuth) {
            errors.push('Either username/password OR auth token + instance URL is required for Salesforce');
        }

        return {
            valid: errors.length === 0,
            errors: [...super.validateConfig().errors, ...errors],
        };
    }
}
