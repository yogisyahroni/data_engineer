import { z } from 'zod';

/**
 * Semantic Layer Validation Schemas
 * 
 * Prevents SQL injection and ensures data integrity
 */

// SQL Safety: Block destructive operations
const FORBIDDEN_SQL_KEYWORDS = [
    'DROP', 'DELETE', 'UPDATE', 'INSERT', 'TRUNCATE', 'ALTER',
    'CREATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE'
];

const noDestructiveSQL = (sql: string) => {
    const upperSQL = sql.toUpperCase();
    return !FORBIDDEN_SQL_KEYWORDS.some(keyword => upperSQL.includes(keyword));
};

// Metric Schemas
export const CreateMetricSchema = z.object({
    name: z.string()
        .regex(/^[a-z_][a-z0-9_]*$/, 'Name must be snake_case (lowercase, underscores only)')
        .min(1)
        .max(50),
    label: z.string().min(1).max(100),
    description: z.string().optional(),
    type: z.enum(['sum', 'avg', 'count', 'min', 'max', 'formula']),
    definition: z.string()
        .min(1)
        .max(500)
        .refine(noDestructiveSQL, 'SQL formula contains forbidden keywords (DROP, DELETE, etc.)'),
    connectionId: z.string().cuid(),
    collectionId: z.string().cuid().optional(),
});

export const UpdateMetricSchema = CreateMetricSchema.partial().omit({ connectionId: true });

// Dimension Schemas
export const CreateDimensionSchema = z.object({
    name: z.string()
        .regex(/^[a-z_][a-z0-9_]*$/, 'Name must be snake_case')
        .min(1)
        .max(50),
    label: z.string().min(1).max(100),
    description: z.string().optional(),
    type: z.enum(['string', 'number', 'date', 'boolean']),
    tableName: z.string()
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid table name')
        .min(1)
        .max(100),
    columnName: z.string()
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid column name')
        .min(1)
        .max(100),
    connectionId: z.string().cuid(),
    collectionId: z.string().cuid().optional(),
});

export const UpdateDimensionSchema = CreateDimensionSchema.partial().omit({ connectionId: true });

// Relationship Schemas
export const CreateRelationshipSchema = z.object({
    fromTable: z.string()
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid table name')
        .min(1)
        .max(100),
    fromColumn: z.string()
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid column name')
        .min(1)
        .max(100),
    toTable: z.string()
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid table name')
        .min(1)
        .max(100),
    toColumn: z.string()
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid column name')
        .min(1)
        .max(100),
    type: z.enum(['one-to-one', 'one-to-many', 'many-to-many']),
    connectionId: z.string().cuid(),
});

export const UpdateRelationshipSchema = CreateRelationshipSchema.partial().omit({ connectionId: true });

// Type exports
export type CreateMetricInput = z.infer<typeof CreateMetricSchema>;
export type UpdateMetricInput = z.infer<typeof UpdateMetricSchema>;
export type CreateDimensionInput = z.infer<typeof CreateDimensionSchema>;
export type UpdateDimensionInput = z.infer<typeof UpdateDimensionSchema>;
export type CreateRelationshipInput = z.infer<typeof CreateRelationshipSchema>;
export type UpdateRelationshipInput = z.infer<typeof UpdateRelationshipSchema>;
