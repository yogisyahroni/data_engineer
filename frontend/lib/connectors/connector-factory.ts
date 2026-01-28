// import { BaseConnector, ConnectionConfig, DataSourceType } from './base-connector';
import { BaseConnector, ConnectionConfig, DataSourceType } from './base-connector';
import { PostgresConnector } from './postgres-connector';
// import { MySQLConnector } from './mysql-connector';
// import { SnowflakeConnector } from './snowflake-connector';
// import { CSVConnector } from './csv-connector';

// Cloud Data Warehouses
// import { BigQueryConnector } from './bigquery-connector';
// import { RedshiftConnector } from './redshift-connector';
// import { DatabricksConnector } from './databricks-connector';

// File Connectors
// import { ExcelConnector } from './excel-connector';
// import { JSONConnector } from './json-connector';
// import { ParquetConnector } from './parquet-connector';

// API Connectors
// import { RESTConnector } from './rest-connector';
// import { GraphQLConnector } from './graphql-connector';
// import { SalesforceConnector } from './salesforce-connector';
// import { HubSpotConnector } from './hubspot-connector';

/**
 * Connector Factory (Factory Pattern)
 * 
 * Central registry for all connector types.
 * This makes it easy to add new connectors without changing existing code.
 */

type ConnectorConstructor = new (config: ConnectionConfig) => BaseConnector;

export class ConnectorFactory {
    private static connectorRegistry = new Map<DataSourceType, ConnectorConstructor>();

    /**
     * Register a connector type
     */
    static register(type: DataSourceType, connectorClass: ConnectorConstructor) {
        this.connectorRegistry.set(type, connectorClass);
    }

    /**
     * Create a connector instance
     */
    static create(config: ConnectionConfig): BaseConnector {
        const ConnectorClass = this.connectorRegistry.get(config.type);

        if (!ConnectorClass) {
            // throw new Error(`Unsupported data source type: ${config.type}. Register it first using ConnectorFactory.register()`);
            // Fallback to Postgres for testing if type not found, or throw better error
            // For now, if Postgres is the only one, allow it for 'postgres' type
            if (config.type !== 'postgres') {
                console.warn(`Connector ${config.type} not ready, falling back to Stub or Error`);
                throw new Error(`Connector ${config.type} temporarily disabled for build check`);
            }
            return new PostgresConnector(config);
        }

        return new ConnectorClass(config);
    }

    /**
     * Get list of supported connector types
     */
    static getSupportedTypes(): DataSourceType[] {
        return Array.from(this.connectorRegistry.keys());
    }

    /**
     * Check if a type is supported
     */
    static isSupported(type: DataSourceType): boolean {
        return this.connectorRegistry.has(type);
    }
}

// Register built-in connectors

// SQL Databases
ConnectorFactory.register('postgres', PostgresConnector);
// ConnectorFactory.register('mysql', MySQLConnector);

// Cloud Data Warehouses
// ConnectorFactory.register('snowflake', SnowflakeConnector);
// ConnectorFactory.register('bigquery', BigQueryConnector);
// ConnectorFactory.register('redshift', RedshiftConnector);
// ConnectorFactory.register('databricks', DatabricksConnector);

// File Connectors
// ConnectorFactory.register('csv', CSVConnector);
// ConnectorFactory.register('excel', ExcelConnector);
// ConnectorFactory.register('json', JSONConnector);
// ConnectorFactory.register('parquet', ParquetConnector);

// API Connectors
// ConnectorFactory.register('rest', RESTConnector);
// ConnectorFactory.register('graphql', GraphQLConnector);
// ConnectorFactory.register('salesforce', SalesforceConnector);
// ConnectorFactory.register('hubspot', HubSpotConnector);
