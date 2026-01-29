import { db } from "@/lib/db";

// React Flow compatible types
export interface LineageNode {
    id: string;
    type: 'custom' | 'input' | 'output' | 'default';
    data: {
        label: string;
        type: 'SOURCE' | 'PIPELINE' | 'DESTINATION';
        details?: any
    };
    position: { x: number; y: number }; // We'll set 0,0 and let dagre handle layout
}

export interface LineageEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
    animated?: boolean;
}

export interface LineageGraph {
    nodes: LineageNode[];
    edges: LineageEdge[];
}

export const lineageService = {
    async buildGraph(workspaceId: string): Promise<LineageGraph> {
        const pipelines = await db.pipeline.findMany({
            where: { workspaceId },
            select: {
                id: true,
                name: true,
                sourceType: true,
                sourceConfig: true,
                destinationType: true,
                destinationConfig: true
            }
        });

        const nodes: Map<string, LineageNode> = new Map();
        const edges: LineageEdge[] = [];

        pipelines.forEach(pipeline => {
            const pipelineNodeId = `pipeline-${pipeline.id}`;

            // 1. Pipeline Node
            nodes.set(pipelineNodeId, {
                id: pipelineNodeId,
                type: 'default', // or custom
                data: { label: pipeline.name, type: 'PIPELINE' },
                position: { x: 0, y: 0 }
            });

            // 2. Source Node
            let sourceId = '';
            let sourceLabel = '';
            const config = pipeline.sourceConfig as any;

            if (pipeline.sourceType === 'postgres') {
                sourceLabel = config.tableName || 'Unknown Table';
                sourceId = `table-${sourceLabel}`;
            } else if (pipeline.sourceType === 'rest') {
                sourceLabel = config.endpoint || 'API Endpoint';
                sourceId = `api-${sourceLabel}`;
            } else if (pipeline.sourceType === 'csv') {
                sourceLabel = 'CSV Upload';
                sourceId = `csv-${pipeline.id}`; // CSVs are usually unique per pipeline upload
            } else {
                sourceLabel = 'Unknown Source';
                sourceId = `unknown-${pipeline.id}`;
            }

            if (!nodes.has(sourceId)) {
                nodes.set(sourceId, {
                    id: sourceId,
                    type: 'input',
                    data: { label: sourceLabel, type: 'SOURCE' },
                    position: { x: 0, y: 0 }
                });
            }

            // Edge: Source -> Pipeline
            edges.push({
                id: `edge-${sourceId}-${pipelineNodeId}`,
                source: sourceId,
                target: pipelineNodeId,
                animated: true
            });

            // 3. Destination Node
            let destId = '';
            let destLabel = '';

            if (pipeline.destinationType === 'INTERNAL_RAW') {
                destLabel = 'Raw Store';
                destId = 'internal-raw';
            } else if (pipeline.destinationType === 'POSTGRES') {
                const destConfig = pipeline.destinationConfig as any;
                destLabel = destConfig?.tableName || 'Dest Table';
                destId = `dest-${destLabel}`;
            } else {
                destLabel = pipeline.destinationType;
                destId = `dest-${pipeline.destinationType}`;
            }

            if (!nodes.has(destId)) {
                nodes.set(destId, {
                    id: destId,
                    type: 'output',
                    data: { label: destLabel, type: 'DESTINATION' },
                    position: { x: 0, y: 0 }
                });
            }

            // Edge: Pipeline -> Destination
            edges.push({
                id: `edge-${pipelineNodeId}-${destId}`,
                source: pipelineNodeId,
                target: destId,
                animated: true
            });
        });

        return {
            nodes: Array.from(nodes.values()),
            edges
        };
    }
};
