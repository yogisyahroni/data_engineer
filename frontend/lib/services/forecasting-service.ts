
export interface DataPoint {
    date: string | Date;
    value: number;
}

export interface ForecastResult {
    slope: number;
    intercept: number;
    rSquared: number;
    forecast: DataPoint[];
    history: DataPoint[];
    confidenceInterval: number; // e.g. 1.96 * stdErr
    upperBound: DataPoint[];
    lowerBound: DataPoint[];
}

export class ForecastingService {
    /**
     * Performs Linear Regression to forecast N periods ahead.
     * Uses Ordinary Least Squares (OLS) method.
     */
    predict(history: DataPoint[], periods: number = 6): ForecastResult {
        const n = history.length;
        if (n < 2) {
            throw new Error("Insufficient data for forecasting. Need at least 2 data points.");
        }

        // 1. Prepare X (Time Index) and Y (Value)
        // We map dates to simple indices 0, 1, 2... for regression stability
        const xValues = Array.from({ length: n }, (_, i) => i);
        const yValues = history.map(d => d.value);

        // 2. Calculate Sums
        const sumX = xValues.reduce((a, b) => a + b, 0);
        const sumY = yValues.reduce((a, b) => a + b, 0);
        const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
        const sumXX = xValues.reduce((acc, x) => acc + x * x, 0);

        // 3. Calculate Slope (m) and Intercept (b)
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // 4. Calculate R-Squared (Goodness of Fit)
        const yMean = sumY / n;
        const totalSS = yValues.reduce((acc, y) => acc + Math.pow(y - yMean, 2), 0);
        const residualSS = yValues.reduce((acc, y, i) => {
            const pred = slope * xValues[i] + intercept;
            return acc + Math.pow(y - pred, 2);
        }, 0);
        const rSquared = 1 - (residualSS / totalSS);

        // 5. Calculate Standard Error (for Confidence Intervals)
        // StdErr = Sqrt( Sum(Residuals^2) / (n-2) )
        const stdErr = Math.sqrt(residualSS / (n - 2));
        const tStat = 1.96; // 95% Confidence (Approx for n>30, simplified)
        const marginOfError = tStat * stdErr;

        // 6. Generate Forecast
        const forecast: DataPoint[] = [];
        const upperBound: DataPoint[] = [];
        const lowerBound: DataPoint[] = [];

        // Last known date to increment from
        const lastDate = new Date(history[n - 1].date);

        // Determine average gap between dates to increment correctly
        // (Simplistic assumption: Evenly spaced time buckets from Aggregation Service)
        const firstDate = new Date(history[0].date);
        const avgTimeDiff = (lastDate.getTime() - firstDate.getTime()) / (n - 1);

        for (let i = 1; i <= periods; i++) {
            const futureX = (n - 1) + i; // Continue index
            const predictedVal = slope * futureX + intercept;

            const nextDate = new Date(lastDate.getTime() + avgTimeDiff * i);
            const isoDate = nextDate.toISOString();

            forecast.push({ date: isoDate, value: predictedVal });

            // Confidence Bounds (Simplified: Constant width, in reality it widens)
            // A better formula widens carefully: SE_forecast = StdErr * Sqrt(1 + 1/n + (x - x_mean)^2 / Sxx)
            const xMean = sumX / n;
            const sxx = sumXX - (sumX * sumX) / n;
            const width = tStat * stdErr * Math.sqrt(1 + (1 / n) + Math.pow(futureX - xMean, 2) / sxx);

            upperBound.push({ date: isoDate, value: predictedVal + width });
            lowerBound.push({ date: isoDate, value: predictedVal - width });
        }

        return {
            slope,
            intercept,
            rSquared,
            history,
            forecast,
            confidenceInterval: marginOfError,
            upperBound,
            lowerBound
        };
    }
}

export const forecastingService = new ForecastingService();
