import { LineageGraphWrapper } from "@/components/pipelines/lineage/lineage-graph-wrapper";
import { Separator } from "@/components/ui/separator";

interface LineagePageProps {
    params: { workspaceId: string };
}

export default function LineagePage({ params }: LineagePageProps) {
    return (
        <div className="space-y-6 pt-4 h-[calc(100vh-100px)]">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Data Lineage</h2>
                <p className="text-muted-foreground">
                    Visualize dependencies between your sources, data pipelines, and destinations.
                </p>
            </div>

            <Separator />

            <div className="h-full pb-10">
                <LineageGraphWrapper workspaceId={params.workspaceId} />
            </div>
        </div>
    );
}
