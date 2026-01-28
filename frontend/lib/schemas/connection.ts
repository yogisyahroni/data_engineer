import { z } from 'zod';

export const ConnectionTypeSchema = z.enum([
    'postgres',
    'mysql',
    'sqlite',
    'snowflake',
    'bigquery',
]);

export const CreateConnectionSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    type: ConnectionTypeSchema,
    host: z.string().optional(),
    port: z.number().int().optional(),
    database: z.string().min(1, 'Database name is required'),
    username: z.string().optional(),
    password: z.string().optional(),
    userId: z.string().optional(),
});

export const UpdateConnectionSchema = CreateConnectionSchema.partial();

export type CreateConnectionInput = z.infer<typeof CreateConnectionSchema>;
export type UpdateConnectionInput = z.infer<typeof UpdateConnectionSchema>;
