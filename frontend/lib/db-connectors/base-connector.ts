import { SchemaInfo, ColumnInfo } from "@/lib/services/connection-service";

export interface IDatabaseConnector {
    name: string;
    dialect: 'postgres' | 'mysql' | 'mongodb' | 'sqlite';
    execute(query: string): Promise<any>;
    getSchema(): Promise<SchemaInfo>;
    generateDDL(schema: SchemaInfo): string;
}

export abstract class BaseConnector {
    /**
     * Converts a generic SchemaInfo into a DDL string for AI consumption
     */
    generateDDL(schema: SchemaInfo): string {
        return schema.tables.map(table => {
            const columns = table.columns.map(col => {
                let colDef = `  ${col.name} ${col.type}`;
                if (col.isPrimary) colDef += " PRIMARY KEY";
                if (!col.nullable) colDef += " NOT NULL";
                if (col.description) colDef += ` -- ${col.description}`;
                return colDef;
            }).join(",\n");

            return `CREATE TABLE "${table.schema}"."${table.name}" (\n${columns}\n);`;
        }).join("\n\n");
    }
}
