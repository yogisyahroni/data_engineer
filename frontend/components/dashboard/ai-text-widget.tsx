import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface AiTextWidgetProps {
    title: string;
    description?: string;
    initialContent?: string;
}

export function AiTextWidget({ title, description, initialContent }: AiTextWidgetProps) {
    const [content, setContent] = useState<string>(initialContent || "AI summary will appear here. Click regenerate to fetch new insights.");
    const [isLoading, setIsLoading] = useState(false);

    const handleRegenerate = async () => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setContent("Here is a fresh AI-generated summary of your dashboard data. Sales are up 15% compared to last month, driven primarily by strong performance in the North America region.");
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto p-1">
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[80%]" />
                    </div>
                ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p>{content}</p>
                    </div>
                )}
            </div>
            <div className="flex justify-end pt-2 mt-auto border-t border-border/50">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isLoading}
                    className="text-xs h-7 gap-1.5 text-muted-foreground hover:text-primary"
                >
                    {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {isLoading ? 'Thinking...' : 'Regenerate Insights'}
                </Button>
            </div>
        </div>
    );
}
