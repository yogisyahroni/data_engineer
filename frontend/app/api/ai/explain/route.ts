import { NextRequest, NextResponse } from "next/server";
import { AIProviderFactory } from "@/lib/ai/providers/provider-factory";

export async function POST(req: NextRequest) {
    try {
        const { data, context } = await req.json();

        if (!data || !Array.isArray(data)) {
            return NextResponse.json({ error: "Invalid data provided" }, { status: 400 });
        }

        // Limit data size for AI context window
        const sampleData = data.slice(0, 50);

        // Get Provider (Default to Gemini or based on user settings)
        // For now, hardcode 'gemini' or 'google'
        const provider = AIProviderFactory.getProvider('gemini');

        // Use analyzeResults
        const promptContext = context || "Analyze this dataset for key trends and anomalies.";
        const insights = await provider.analyzeResults(sampleData, promptContext);

        return NextResponse.json({ insights });
    } catch (error: any) {
        console.error("[AI Explain API]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
