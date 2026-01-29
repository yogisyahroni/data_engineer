"use client";

import dynamic from "next/dynamic";

// Dynamically import React Flow component to avoid SSR issues with canvas/window
const LineageGraph = dynamic(
    () => import("@/components/pipelines/lineage/lineage-graph"),
    { ssr: false }
);

export function LineageGraphWrapper({ workspaceId }: { workspaceId: string }) {
    return <LineageGraph workspaceId={workspaceId} />;
}
