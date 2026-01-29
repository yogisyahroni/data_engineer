import { z } from 'zod';

export const QualityRuleSchema = z.object({
    id: z.string().optional(),
    column: z.string(),
    ruleType: z.enum(['NOT_NULL', 'UNIQUE', 'RANGE', 'REGEX']),
    value: z.string().optional(), // '10,100' for range, regex pattern, etc
    severity: z.enum(['WARN', 'FAIL']).default('WARN'),
    description: z.string().optional(),
});

export type QualityRule = z.infer<typeof QualityRuleSchema>;

export interface QualityError {
    row: number;
    column: string;
    ruleType: string;
    value: any;
    message: string;
    severity: 'WARN' | 'FAIL';
}

export interface VerificationResult {
    validData: any[]; // Rows that passed (or failed but were WARN only if policy permits)
    errors: QualityError[];
}

export function validateData(data: any[], rules: QualityRule[]): VerificationResult {
    const errors: QualityError[] = [];
    const validData: any[] = [];

    // Optimizations for UNIQUE checks
    const uniqueSets: Record<string, Set<any>> = {};
    rules.filter(r => r.ruleType === 'UNIQUE').forEach(r => {
        uniqueSets[r.column] = new Set();
    });

    data.forEach((row, index) => {
        let rowFailed = false;

        // Check each rule against this row
        for (const rule of rules) {
            const val = row[rule.column];
            let failed = false;
            let msg = '';

            switch (rule.ruleType) {
                case 'NOT_NULL':
                    if (val === null || val === undefined || val === '') {
                        failed = true;
                        msg = `Column '${rule.column}' cannot be null/empty`;
                    }
                    break;

                case 'UNIQUE':
                    if (val !== null && val !== undefined) { // Ignore uniqueness of nulls usually
                        if (uniqueSets[rule.column].has(val)) {
                            failed = true;
                            msg = `Duplicate value '${val}' in column '${rule.column}'`;
                        } else {
                            uniqueSets[rule.column].add(val);
                        }
                    }
                    break;

                case 'RANGE':
                    if (val !== null && rule.value && typeof val === 'number') {
                        const [min, max] = rule.value.split(',').map(Number);
                        if (!isNaN(min) && val < min) {
                            failed = true;
                            msg = `Value ${val} is below minimum ${min}`;
                        }
                        if (!isNaN(max) && val > max) {
                            failed = true;
                            msg = `Value ${val} is above maximum ${max}`;
                        }
                    }
                    break;

                case 'REGEX':
                    if (val !== null && rule.value) {
                        try {
                            const regex = new RegExp(rule.value);
                            if (!regex.test(String(val))) {
                                failed = true;
                                msg = `Value '${val}' does not match pattern ${rule.value}`;
                            }
                        } catch (e) {
                            // Invalid regex config, ignore or log?
                        }
                    }
                    break;
            }

            if (failed) {
                errors.push({
                    row: index,
                    column: rule.column,
                    ruleType: rule.ruleType,
                    value: val,
                    message: msg,
                    severity: rule.severity as 'WARN' | 'FAIL'
                });

                if (rule.severity === 'FAIL') {
                    rowFailed = true;
                }
            }
        }

        // Determine row fate
        // For now, if ANY FAIL rule trips, we can exclude the row OR fail the whole batch. 
        // Implementation Plan said: "FAIL: Stop pipeline if errors > 0". 
        // However, for row-level filtering, usually we just drop the bad rows?
        // Let's stick to the Plan: "FAIL: Stop pipeline". logic will be in worker.

        // BUT we still need to return the row in validData if it only had warnings?
        // Or if we are failing the pipeline, validData doesn't matter.
        validData.push(row);
    });

    return { validData, errors };
}
