
import { PipelineBuilder } from "@/components/pipelines/pipeline-builder";

export default async function NewPipelinePage(
    props: { params: Promise<{ workspaceId: string }> }
) {
    const params = await props.params;
    return (
        <div className="p-6">
            <PipelineBuilder workspaceId={params.workspaceId} />
        </div>
    );
}
