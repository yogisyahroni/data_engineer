import { db } from '@/lib/db';
import { Metric, Dimension } from '@prisma/client';

export interface SQLFragment {
    select: string;
    groupBy?: string;
}

export class MetricService {
    /**
     * Translates a Metric definition into a SQL fragment.
     * Supports sum, avg, count, and raw formula types.
     */
    static getSQLFragment(metric: Metric): string {
        switch (metric.type.toLowerCase()) {
            case 'sum':
                return `SUM(${metric.definition}) AS "${metric.name}"`;
            case 'avg':
                return `AVG(${metric.definition}) AS "${metric.name}"`;
            case 'count':
                return `COUNT(${metric.definition}) AS "${metric.name}"`;
            case 'formula':
                return `(${metric.definition}) AS "${metric.name}"`;
            default:
                return `${metric.definition} AS "${metric.name}"`;
        }
    }

    /**
     * Retrieves all metrics for a given connection and builds a semantic context for the AI.
     */
    static async getSemanticContext(connectionId: string): Promise<string> {
        const metrics = await db.metric.findMany({
            where: { connectionId }
        });

        const dimensions = await db.dimension.findMany({
            where: { connectionId }
        });

        let context = "### SEMANTIC LAYER (Business Logic)\n";

        context += "\n#### METRICS (Use these for aggregations):\n";
        metrics.forEach(m => {
            context += `- [${m.name}]: ${m.label} (${m.description || 'No description'}). Formula: ${m.definition}\n`;
        });

        context += "\n#### DIMENSIONS (Use these for grouping/filtering):\n";
        dimensions.forEach(d => {
            context += `- [${d.tableName}].[${d.columnName}]: ${d.label} (${d.description || 'No description'})\n`;
        });

        return context;
    }

    /**
     * Creates a standard business metric for a connection.
     */
    static async createMetric(userId: string, data: {
        name: string;
        label: string;
        type: string;
        definition: string;
        connectionId: string;
        description?: string;
    }) {
        return db.metric.create({
            data: {
                ...data,
                userId
            }
        });
    }
}
