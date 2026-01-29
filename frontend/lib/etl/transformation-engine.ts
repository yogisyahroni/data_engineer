
import { z } from "zod";

// --- Schema Definitions for UI & Validation ---

export const TransformationStepSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("CAST"),
        field: z.string(),
        targetType: z.enum(["number", "string", "boolean", "date"]),
        format: z.string().optional() // e.g. "YYYY-MM-DD"
    }),
    z.object({
        type: z.literal("DROP"),
        fields: z.array(z.string())
    }),
    z.object({
        type: z.literal("KEEP"),
        fields: z.array(z.string())
    }),
    z.object({
        type: z.literal("FILTER"),
        field: z.string(),
        operator: z.enum(["eq", "neq", "gt", "lt", "contains", "not_contains"]),
        value: z.any()
    }),
    z.object({
        type: z.literal("DEDUPLICATE"),
        uniqueKeys: z.array(z.string())
    }),
    z.object({
        type: z.literal("REPLACE"),
        field: z.string(),
        pattern: z.string(), // Regex string
        replacement: z.string()
    }),
    z.object({
        type: z.literal("DEFAULT_VALUE"),
        field: z.string(),
        value: z.any()
    })
]);

export type TransformationStep = z.infer<typeof TransformationStepSchema>;

// --- Execution Logic ---

export function applyTransformations(data: any[], steps: TransformationStep[]): any[] {
    if (!data || data.length === 0) return [];

    let result = [...data];

    for (const step of steps) {
        switch (step.type) {
            case "CAST":
                result = result.map(row => {
                    const val = row[step.field];
                    if (val === undefined || val === null) return row;

                    let newVal = val;
                    try {
                        if (step.targetType === 'number') {
                            newVal = Number(val);
                            if (isNaN(newVal)) newVal = val; // Fail safe?
                        } else if (step.targetType === 'string') {
                            newVal = String(val);
                        } else if (step.targetType === 'boolean') {
                            newVal = Boolean(val);
                        } else if (step.targetType === 'date') {
                            newVal = new Date(val); // Simplistic
                        }
                    } catch (e) {
                        // ignore error, keep original
                    }
                    return { ...row, [step.field]: newVal };
                });
                break;

            case "DROP":
                result = result.map(row => {
                    const newRow = { ...row };
                    step.fields.forEach(f => delete newRow[f]);
                    return newRow;
                });
                break;

            case "KEEP":
                result = result.map(row => {
                    const newRow: any = {};
                    step.fields.forEach(f => {
                        if (row[f] !== undefined) newRow[f] = row[f];
                    });
                    return newRow;
                });
                break;

            case "FILTER":
                result = result.filter(row => {
                    const val = row[step.field];
                    const target = step.value;

                    switch (step.operator) {
                        case 'eq': return val == target;
                        case 'neq': return val != target;
                        case 'gt': return val > target;
                        case 'lt': return val < target;
                        case 'contains': return String(val).includes(String(target));
                        case 'not_contains': return !String(val).includes(String(target));
                        default: return true;
                    }
                });
                break;

            case "DEDUPLICATE":
                // Basic in-memory deduplication based on composite key string
                const seen = new Set();
                result = result.filter(row => {
                    const key = step.uniqueKeys.map(k => row[k]).join('||');
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                break;

            case "REPLACE":
                result = result.map(row => {
                    const val = row[step.field];
                    if (typeof val !== 'string') return row;

                    // Simple global replace logic
                    // In real engine, cache regex
                    const regex = new RegExp(step.pattern, 'g');
                    return { ...row, [step.field]: val.replace(regex, step.replacement) };
                });
                break;

            case "DEFAULT_VALUE":
                result = result.map(row => {
                    if (row[step.field] === undefined || row[step.field] === null || row[step.field] === '') {
                        return { ...row, [step.field]: step.value };
                    }
                    return row;
                });
                break;
        }
    }

    return result;
}
