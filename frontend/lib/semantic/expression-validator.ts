export interface ValidationResult {
    valid: boolean;
    error?: string;
    dependencies: string[];
}

/**
 * Validates a virtual metric expression
 * - Checks for balanced parentheses
 * - Checks for allowed characters
 * - Extracts and verifies dependencies (optional check against list)
 */
export function validateExpression(
    expression: string,
    availableMetrics: string[] = [] // Optional: if provided, validates that ${Metric} exists
): ValidationResult {
    if (!expression || expression.trim() === '') {
        return { valid: false, error: 'Expression cannot be empty', dependencies: [] };
    }

    // 1. Check for balanced parentheses
    let balance = 0;
    for (const char of expression) {
        if (char === '(') balance++;
        if (char === ')') balance--;
        if (balance < 0) {
            return { valid: false, error: 'Unbalanced parentheses: missing opening parenthesis', dependencies: [] };
        }
    }
    if (balance !== 0) {
        return { valid: false, error: 'Unbalanced parentheses: missing closing parenthesis', dependencies: [] };
    }

    // 2. Extract dependencies ${Name}
    const dependencies: string[] = [];
    const regex = /\$\{([^}]+)\}/g;
    let match;
    while ((match = regex.exec(expression)) !== null) {
        const metricName = match[1];
        if (!metricName.trim()) {
            return { valid: false, error: 'Empty variable reference ${}', dependencies: [] };
        }
        dependencies.push(metricName);
    }

    // 3. Validate dependencies against availableMetrics (if provided)
    if (availableMetrics.length > 0) {
        const invalidDeps = dependencies.filter(dep => !availableMetrics.includes(dep));
        if (invalidDeps.length > 0) {
            return {
                valid: false,
                error: `Unknown metrics referenced: ${invalidDeps.join(', ')}`,
                dependencies
            };
        }
    }

    // 4. Basic syntax check (very loose to allow SQL functions)
    // We mainly want to ban dangerous characters if we were executing TS, but this is SQL injection territory.
    // The SQLGenerator handles quoting, but we should ensure the expression doesn't contain obvious bad things like '; DROP'
    // However, since we wrap in (), it's harder.
    // Let's just block common SQL injection terminators if strictly validating.
    if (/;/.test(expression)) {
        return { valid: false, error: 'Semicolons are not allowed in expressions', dependencies };
    }

    return { valid: true, dependencies };
}
