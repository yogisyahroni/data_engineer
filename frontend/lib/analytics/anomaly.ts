export interface AnomalyOptions {
    data: any[];
    valueColumn: string;
    method: 'z-score' | 'iqr';
    sensitivity?: number; // 2 for Z-Score (95%), 1.5 for IQR (Standard)
}

export interface AnomalyResult {
    anomalies: {
        index: number;
        value: number;
        score: number; // Z-Score or deviation
        label?: string; // 'High' or 'Low'
    }[];
}

/**
 * Z-Score Method
 * Best for normally distributed data.
 * Flag if |z| > sensitivity (default 2 or 3)
 */
export function detectAnomaliesZScore(options: AnomalyOptions): AnomalyResult {
    const { data, valueColumn, sensitivity = 2 } = options;
    const values = data.map(d => Number(d[valueColumn]) || 0);

    if (values.length < 2) return { anomalies: [] };

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
        values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / values.length
    );

    if (stdDev === 0) return { anomalies: [] };

    const anomalies = values
        .map((val, idx) => {
            const z = (val - mean) / stdDev;
            if (Math.abs(z) > sensitivity) {
                return {
                    index: idx,
                    value: val,
                    score: z,
                    label: z > 0 ? 'Spike' : 'Drop'
                };
            }
            return null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

    return { anomalies };
}

/**
 * IQR (Interquartile Range) Method
 * Robust to outliers, good for non-normal distributions.
 * Flag if < Q1 - 1.5*IQR or > Q3 + 1.5*IQR
 */
export function detectAnomaliesIQR(options: AnomalyOptions): AnomalyResult {
    const { data, valueColumn, sensitivity = 1.5 } = options;
    const values = data.map(d => Number(d[valueColumn]) || 0);

    if (values.length < 4) return { anomalies: [] };

    // Sort needed for quartiles, but we must keep original indices
    const sortedWithIdx = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);

    const q1Idx = Math.floor(values.length * 0.25);
    const q3Idx = Math.floor(values.length * 0.75);

    const q1 = sortedWithIdx[q1Idx].v;
    const q3 = sortedWithIdx[q3Idx].v;
    const iqr = q3 - q1;

    const lowerBound = q1 - (sensitivity * iqr);
    const upperBound = q3 + (sensitivity * iqr);

    const anomalies = values
        .map((val, idx) => {
            if (val < lowerBound) {
                return {
                    index: idx,
                    value: val,
                    score: lowerBound - val,
                    label: 'Low Outlier'
                };
            }
            if (val > upperBound) {
                return {
                    index: idx,
                    value: val,
                    score: val - upperBound,
                    label: 'High Outlier'
                };
            }
            return null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

    return { anomalies };
}
