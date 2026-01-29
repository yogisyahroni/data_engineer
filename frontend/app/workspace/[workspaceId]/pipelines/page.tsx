
import { PipelineList } from "@/components/pipelines/pipeline-list";
import { Separator } from "@/components/ui/separator";

export default async function PipelinesPage(
    props: { params: Promise<{ workspaceId: string }> }
) {
    const params = await props.params;
    return (
        <div className="space-y-6 p-6">
            <div>
                <h3 className="text-lg font-medium">Pipelines</h3>
                <p className="text-sm text-muted-foreground">
                    Automate data extraction from databases and APIs into your warehouse.
                </p>
            </div>
            <Separator />
            <PipelineList workspaceId={params.workspaceId} />
        </div>
    );
}
