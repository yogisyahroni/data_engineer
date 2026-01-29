"use client";

import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    Controls,
    Background,
    MiniMap,
    Position,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = direction === 'LR' ? Position.Left : Position.Top;
        node.sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom;

        // We are shifting the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
    });

    return { nodes, edges };
};

interface LineageGraphProps {
    workspaceId: string;
}

export default function LineageGraph({ workspaceId }: LineageGraphProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/workspaces/${workspaceId}/lineage`);
                const data = await res.json();

                if (data.nodes && data.edges) {
                    // Style nodes based on type
                    const styledNodes = data.nodes.map((node: any) => ({
                        ...node,
                        style: {
                            border: '1px solid #777',
                            padding: 10,
                            borderRadius: 5,
                            background:
                                node.data.type === 'SOURCE' ? '#eef' :
                                    node.data.type === 'DESTINATION' ? '#efe' :
                                        '#fff',
                            fontWeight: node.data.type === 'PIPELINE' ? 'bold' : 'normal'
                        }
                    }));

                    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                        styledNodes,
                        data.edges.map((edge: any) => ({
                            ...edge,
                            markerEnd: { type: MarkerType.ArrowClosed }
                        }))
                    );

                    setNodes(layoutedNodes);
                    setEdges(layoutedEdges);
                }
            } catch (error) {
                console.error("Failed to fetch lineage", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [workspaceId, setNodes, setEdges]);

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Card className="h-[600px] w-full">
            <CardHeader className="p-4 border-b">
                <CardTitle className="text-lg">Data Lineage Graph</CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[550px]">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    fitView
                >
                    <Controls />
                    <MiniMap />
                    <Background gap={12} size={1} />
                </ReactFlow>
            </CardContent>
        </Card>
    );
}
