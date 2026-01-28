export interface ClusterOptions {
    data: any[];
    features: string[]; // Columns to use for clustering
    k: number; // Number of clusters
    maxIterations?: number;
}

export interface ClusterResult {
    clusters: {
        dataIndex: number;
        clusterId: number;
        centroidDistance: number;
    }[];
    centroids: number[][];
}

/**
 * K-Means Clustering Algorithm
 * Simple implementations for numeric features.
 */
export function kMeansCluster(options: ClusterOptions): ClusterResult {
    const { data, features, k, maxIterations = 50 } = options;

    if (data.length < k) {
        // Degenerate case: fewer points than clusters
        return {
            clusters: data.map((_, i) => ({ dataIndex: i, clusterId: 0, centroidDistance: 0 })),
            centroids: []
        };
    }

    // 1. Extract feature vectors
    const vectors = data.map(d => features.map(f => Number(d[f]) || 0));

    // 2. Normalize features (Min-Max Scaling) to prevent one feature dominating distance
    // Important for K-Means!
    const minMax = features.map((_, colIdx) => {
        const colVals = vectors.map(v => v[colIdx]);
        return {
            min: Math.min(...colVals),
            max: Math.max(...colVals)
        };
    });

    const normalizedVectors = vectors.map(v =>
        v.map((val, colIdx) => {
            const mm = minMax[colIdx];
            if (mm.max === mm.min) return 0;
            return (val - mm.min) / (mm.max - mm.min);
        })
    );

    // 3. Initialize Centroids (Random initialization)
    let centroids: number[][] = [];
    const pickedIndices = new Set<number>();
    while (centroids.length < k) {
        const idx = Math.floor(Math.random() * vectors.length);
        if (!pickedIndices.has(idx)) {
            pickedIndices.add(idx);
            centroids.push([...normalizedVectors[idx]]);
        }
    }

    let clusters: { dataIndex: number, clusterId: number, centroidDistance: number }[] = [];
    let iterations = 0;
    let didChange = true;

    while (iterations < maxIterations && didChange) {
        didChange = false;

        // Assign points to nearest centroid
        clusters = normalizedVectors.map((vec, idx) => {
            let minDist = Infinity;
            let clusterId = 0;

            centroids.forEach((centroid, cId) => {
                const dist = euclideanDist(vec, centroid);
                if (dist < minDist) {
                    minDist = dist;
                    clusterId = cId;
                }
            });

            return { dataIndex: idx, clusterId, centroidDistance: minDist };
        });

        // Update centroids
        const newCentroids = Array(k).fill(0).map(() => Array(features.length).fill(0));
        const clusterCounts = Array(k).fill(0);

        clusters.forEach(c => {
            const vec = normalizedVectors[c.dataIndex];
            clusterCounts[c.clusterId]++;
            vec.forEach((val, dim) => {
                newCentroids[c.clusterId][dim] += val;
            });
        });

        // Average position
        newCentroids.forEach((cVec, cId) => {
            if (clusterCounts[cId] > 0) {
                cVec.forEach((val, dim) => {
                    newCentroids[cId][dim] = val / clusterCounts[cId];
                });
            } else {
                // Handle empty cluster: re-initialize random
                // For simplicity, keep old centroid or move to a random point
                const rIdx = Math.floor(Math.random() * normalizedVectors.length);
                newCentroids[cId] = [...normalizedVectors[rIdx]];
            }
        });

        // Check convergence
        // Simple check: do centroids move significantly?
        const change = newCentroids.reduce((sum, nc, cId) => sum + euclideanDist(nc, centroids[cId]), 0);
        if (change < 0.001) didChange = false;

        centroids = newCentroids;
        iterations++;
    }

    return { clusters, centroids };
}

function euclideanDist(a: number[], b: number[]) {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}
