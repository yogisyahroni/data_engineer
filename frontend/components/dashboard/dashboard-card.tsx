'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, Trash2, Maximize2, Pencil, Sparkles, Download } from 'lucide-react';
import {
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CommentThread } from '@/components/collaboration/comment-thread';
import { MessageSquare } from 'lucide-react';
import { ChartVisualization } from '@/components/chart-visualization';
import { VisualizationConfig } from '@/lib/types';
import { AiTextWidget } from "./ai-text-widget";
import { ExportService } from '@/lib/services/export-service';
import { toast } from 'sonner';

interface DashboardCardProps {
    card: {
        id: string;
        title: string;
        type: 'visualization' | 'text' | 'ai-text';
        data?: any[];
        visualizationConfig?: VisualizationConfig;
        query?: { visualizationConfig?: VisualizationConfig };
        textContent?: string;
        description?: string;
    };
    isEditing?: boolean;
    onRemove?: (cardId: string) => void;
    onEdit?: (cardId: string) => void;
    className?: string;
    onChartClick?: (params: any, cardId: string) => void;
    onDrillThrough?: (cardId: string) => void;
}

export function DashboardCard({
    card,
    isEditing,
    onRemove,
    onEdit,
    className,
    onChartClick,
    onDrillThrough
}: DashboardCardProps) {
    return (
        <Card className={`h-full flex flex-col overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow relative group ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-border/50 flex items-center justify-between flex-shrink-0 h-[52px]">
                <div className="min-w-0 flex-1 mr-2">
                    <h3 className="font-semibold text-sm truncate flex items-center gap-2">
                        {card.type === 'ai-text' && <Sparkles className="h-3.5 w-3.5 text-primary" />}
                        {card.title}
                    </h3>
                    {card.description && (
                        <p className="text-[10px] text-muted-foreground truncate">{card.description}</p>
                    )}
                </div>
                {/* Comments Trigger */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 mr-1 hover:bg-muted">
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="end" side="bottom">
                        <CommentThread cardId={card.id} />
                    </PopoverContent>
                </Popover>

                {/* Menu Actions */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreVertical className="h-3 w-3" />
                            <span className="sr-only">Menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(card.id)}>
                                <Pencil className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                Edit
                            </DropdownMenuItem>
                        )}
                        {onDrillThrough && (
                            <DropdownMenuItem onClick={() => onDrillThrough(card.id)}>
                                <Maximize2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                View Underlying Data
                            </DropdownMenuItem>
                        )}
                        {card.type === 'visualization' && card.data && card.data.length > 0 && (
                            <DropdownMenuItem onClick={() => {
                                try {
                                    ExportService.exportDataToCSV(card.data!, `${card.title.replace(/\s+/g, '_')}_data.csv`);
                                    toast.success('CSV exported successfully');
                                } catch (error) {
                                    toast.error('Failed to export CSV');
                                }
                            }}>
                                <Download className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                Export to CSV
                            </DropdownMenuItem>
                        )}
                        {onRemove && (
                            <DropdownMenuItem onClick={() => onRemove(card.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Remove
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Content */}
            <CardContent className="flex-1 p-4 overflow-hidden relative">
                {card.type === 'visualization' ? (
                    <ChartVisualization
                        config={card.visualizationConfig || card.query?.visualizationConfig || {}}
                        data={card.data || []} // TODO: Pass real data
                        isLoading={false} // TODO: valid loading state
                        onDataClick={(params) => onChartClick?.(params, card.id)}
                    />
                ) : card.type === 'ai-text' ? (
                    <AiTextWidget
                        title={card.title}
                        description={card.description}
                        initialContent={card.textContent}
                    />
                ) : (
                    <div className="prose prose-sm dark:prose-invert overflow-auto h-full">
                        {card.textContent || 'No content'}
                    </div>
                )}
            </CardContent>

            {/* Resize Handle only in edit mode */}
        </Card>
    );
}
