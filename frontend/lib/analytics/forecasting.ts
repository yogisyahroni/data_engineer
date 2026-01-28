export interface DataPoint {
    [key: string]: any;
}

export interface ForecastResult {
    forecast: DataPoint[];
    confidenceInterval?: {
        lower: DataPoint[];
        upper: DataPoint[];
    };
}

export interface ForecastOptions {
    data: DataPoint[];
    dateColumn: string;
    valueColumn: string;
    periods: number;
    model: 'linear' | 'exponential_smoothing';
    confidenceLevel?: number; // 0.95 default
}

/**
 * Simple Linear Regression Forecast
 * y = mx + b
 */
export function calculateLinearForecast(options: ForecastOptions): ForecastResult {
    const { data, dateColumn, valueColumn, periods } = options;

    if (data.length < 2) return { forecast: [] };

    // Convert dates to time numbers for calculation
    const points = data.map((d, i) => ({
        x: i,
        y: Number(d[valueColumn]) || 0,
        originalDate: new Date(d[dateColumn]).getTime()
    }));

    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    points.forEach(p => {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumXX += p.x * p.x;
    });

    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const b = (sumY - m * sumX) / n;

    // Calculate average time interval to project dates
    const firstTime = points[0].originalDate;
    const lastTime = points[n - 1].originalDate;
    const avgInterval = (lastTime - firstTime) / (n - 1);

    const forecast: DataPoint[] = [];

    for (let i = 1; i <= periods; i++) {
        const nextX = n - 1 + i;
        const nextY = m * nextX + b;
        const nextTime = lastTime + (i * avgInterval);

        forecast.push({
            [dateColumn]: new Date(nextTime).toISOString(),
            [valueColumn]: nextY,
            _isForecast: true
        });
    }

    return { forecast };
}

/**
 * Holt-Winters (Triple Exponential Smoothing)
 * Implementation adapted for additive seasonality
 */
export function calculateHoltWinters(options: ForecastOptions): ForecastResult {
    const { data, dateColumn, valueColumn, periods } = options;
    const series = data.map(d => Number(d[valueColumn]) || 0);

    // Heuristic for season length: check provided data length
    // If < 20 points, assume no seasonality or short seasonality (e.g. 4 for quarterly)
    // Ideally this should be detected or parameterized.
    // For MVP, we'll try a season length of 7 (weekly) or 12 (monthly) if we have enough data,
    // otherwise fallback to Holt's Linear (Double Exp Smoothing).

    let seasonLength = 7;
    if (series.length >= 24) seasonLength = 12; // Assume monthly
    if (series.length < 14) seasonLength = 0; // Not enough data for seasonal

    // If series too short, fallback to Linear
    if (seasonLength === 0 || series.length < seasonLength * 2) {
        return calculateLinearForecast(options);
    }

    // Alpha (Level), Beta (Trend), Gamma (Seasonality)
    const alpha = 0.5;
    const beta = 0.4;
    const gamma = 0.6;

    let level = series[0];
    let trend = series[1] - series[0];

    // Initial seasonal indices
    const seasonal: number[] = [];
    let seasonalAvg = 0;
    for (let i = 0; i < seasonLength; i++) seasonalAvg += series[i];
    seasonalAvg /= seasonLength;
    for (let i = 0; i < seasonLength; i++) seasonal.push(series[i] - seasonalAvg);

    // Smoothing
    const result: number[] = [...series]; // Keep history? or just end state?
    // We need end state to forecast

    // Re-calculating full series to get end parameters
    // Note: A more robust impl would do initial decomposition. 
    // This is a simplified iterative approach.

    // Let's implement standard iterative HW
    let L = level;
    let T = trend;
    let S = [...seasonal];

    for (let i = 0; i < series.length; i++) {
        const val = series[i];
        const sIdx = i % seasonLength;
        const lastL = L;

        // Level
        L = alpha * (val - S[sIdx]) + (1 - alpha) * (lastL + T);
        // Trend
        T = beta * (L - lastL) + (1 - beta) * T;
        // Seasonality
        S[sIdx] = gamma * (val - L) + (1 - gamma) * S[sIdx];
    }

    // Forecast
    const forecastPoints: DataPoint[] = [];
    const lastTime = new Date(data[data.length - 1][dateColumn]).getTime();
    // Avg interval heuristic
    const firstTime = new Date(data[0][dateColumn]).getTime();
    const interval = (lastTime - firstTime) / (data.length - 1);

    for (let h = 1; h <= periods; h++) {
        const sIdx = (series.length + h - 1) % seasonLength;
        const forecastVal = L + h * T + S[sIdx];
        const nextTime = lastTime + (h * interval);

        forecastPoints.push({
            [dateColumn]: new Date(nextTime).toISOString(),
            [valueColumn]: forecastVal,
            _isForecast: true
        });
    }

    return { forecast: forecastPoints };
}

/**
 * Decomposition Model (Prophet-style approximation)
 * y(t) = Trend(t) + Seasonality(t) + Noise
 */
export function calculateDecompositionForecast(options: ForecastOptions): ForecastResult {
    const { data, dateColumn, valueColumn, periods } = options;
    const values = data.map(d => Number(d[valueColumn]) || 0);
    const n = values.length;

    // 1. Detect Trend (using Linear Regression on entire dataset for base trend)
    // A better approach would be piece-wise, but for MVP global linear is okay.
    const indices = values.map((_, i) => i);
    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((a, i) => a + (i * values[i]), 0);
    const sumXX = indices.reduce((a, i) => a + (i * i), 0);

    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const b = (sumY - m * sumX) / n;

    const trend = indices.map(i => m * i + b);

    // 2. Detrend to get Seasonality
    const detrended = values.map((v, i) => v - trend[i]);

    // 3. Seasonality Extraction
    // Assume 7 (Weekly) for simplicity or length/4
    let seasonLength = 7;
    if (n > 20) seasonLength = Math.max(7, Math.floor(n / 4)); // Heuristic

    const seasonalIndices = Array(seasonLength).fill(0).map(() => ({ sum: 0, count: 0 }));

    detrended.forEach((val, i) => {
        const sIdx = i % seasonLength;
        seasonalIndices[sIdx].sum += val;
        seasonalIndices[sIdx].count++;
    });

    const seasonPattern = seasonalIndices.map(s => s.count > 0 ? s.sum / s.count : 0);

    // 4. Forecast
    const forecastPoints: DataPoint[] = [];
    const lastTime = new Date(data[n - 1][dateColumn]).getTime();
    const firstTime = new Date(data[0][dateColumn]).getTime();
    const interval = (lastTime - firstTime) / (n - 1);

    for (let h = 1; h <= periods; h++) {
        const idx = n - 1 + h;
        const trendVal = m * idx + b;
        const seasonVal = seasonPattern[idx % seasonLength];
        const val = trendVal + seasonVal;

        const nextTime = lastTime + (h * interval);
        forecastPoints.push({
            [dateColumn]: new Date(nextTime).toISOString(),
            [valueColumn]: val,
            _isForecast: true
        });
    }

    return { forecast: forecastPoints };
}
