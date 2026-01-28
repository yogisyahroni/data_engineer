/**
 * Connector System - Central Exports
 * 
 * Usage:
 * ```ts
 * import { ConnectorFactory, connectionPool } from '@/lib/connectors';
 * 
 * const connector = ConnectorFactory.create({
 *   type: 'postgres',
 *   host: 'localhost',
 *   database: 'mydb',
 *   username: 'user',
 *   password: 'pass'
 * });
 * 
 * const result = await connector.testConnection();
 * const schema = await connector.fetchSchema();
 * ```
 */

export * from './base-connector';
export * from './connector-factory';
export * from './connection-pool';
export * from './postgres-connector';
export * from './mysql-connector';
export * from './snowflake-connector';
export * from './csv-connector';

// Future exports:
// export * from './bigquery-connector';
// export * from './redshift-connector';
