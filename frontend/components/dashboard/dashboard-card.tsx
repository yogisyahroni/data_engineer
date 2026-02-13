'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, Trash2, Maximize2, Pencil, Sparkles, Download, Image, FileText } from 'lucide-react';
import {
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenu,
    DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CommentThread } from '@/components/collaboration/comment-thread';
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';
import dynamic from 'next/dynamic';
const ChartVisualization = dynamic(() => import('@/components/chart-visualization').then(mod => mod.ChartVisualization), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-muted/20 animate-pulse rounded-lg"><span className="text-muted-foreground text-xs">Loading Visualization...</span></div>
});
import { VisualizationConfig } from '@/lib/types';
import { AiTextWidget } from "./ai-text-widget";
import { ExportService } from '@/lib/services/export-service';
import { StatusBadge } from '@/components/catalog/status-badge';

import { toast } from 'sonner';
import { AIExplainDialog } from './ai-explain-dialog';

import { FilterCriteria } from '@/lib/cross-filter-context';
import { useSession } from 'next-auth/react';
import { useComments } from '@/hooks/use-comments';

interface DashboardCardProps {
    card: {
        id: string;
        title: string;
        type: 'visualization' | 'text' | 'ai-text';
        data?: any[];
        visualizationConfig?: VisualizationConfig;
        query?: {
            visualizationConfig?: VisualizationConfig;
            certificationStatus?: 'draft' | 'verified' | 'deprecated';
        };
        textContent?: string;
        description?: string;
    };
    isEditing?: boolean;
    onRemove?: (cardId: string) => void;
    onEdit?: (cardId: string) => void;
    className?: string;
    onChartClick?: (params: any, cardId: string) => void;
    onDrillThrough?: (cardId: string) => void;
    activeFilters?: FilterCriteria[];
}

export function DashboardCard({
    card,
    isEditing,
    onRemove,
    onEdit,
    className,
    onChartClick,
    onDrillThrough,
    activeFilters = []
}: DashboardCardProps) {
    const [isExplainOpen, setIsExplainOpen] = useState(false);
    const { data: session } = useSession();
    const currentUserId = session?.user?.id || '';

    const {
        comments,
        isLoading: isCommentsLoading,
        createComment,
        deleteComment,
        updateComment,
        resolveComment
    } = useComments('card', card.id);
    return (
        <>
            <Card id={`card-${card.id}`} className={`h-full flex flex-col overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow relative group ${className}`}>
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
                            <Button variant="ghost" size="icon" className="h-6 w-6 mr-1 hover:bg-muted relative">
                                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                {comments.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="end" side="bottom">
                            <CommentThread
                                entityType="card"
                                entityId={card.id}
                                comments={comments}
                                currentUserId={currentUserId}
                                isLoading={isCommentsLoading}
                                onCreateComment={async (data) => {
                                    const result = await createComment({ ...data, entityType: 'card', entityId: card.id });
                                    if (!result.success) throw new Error(result.error);
                                }}
                                onResolveComment={async (commentId, isResolved) => {
                                    await resolveComment(commentId, isResolved);
                                }}
                                onDeleteComment={async (commentId) => {
                                    await deleteComment(commentId);
                                }}
                                onEditComment={async (commentId, content) => {
                                    await updateComment(commentId, content);
                                }}
                            />
                        </PopoverContent>
                    </Popover>

                    {/* Menu Actions */}
                    <div className="flex items-center">
                        {card.type === 'visualization' && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 mr-1 hover:bg-muted text-purple-500 hover:text-purple-600"
                                onClick={() => setIsExplainOpen(true)}
                                title="Explain with AI"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                            </Button>
                        )}
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
                                {card.type === 'visualization' && (
                                    <>
                                        <DropdownMenuItem onClick={() => {
                                            try {
                                                ExportService.downloadPNG(`card-${card.id}`, card.title);
                                                toast.success('Downloading PNG...');
                                            } catch (e) { toast.error('PNG Export failed'); }
                                        }}>
                                            <Image className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                            Export as PNG
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            try {
                                                ExportService.downloadPDF(`card-${card.id}`, card.title);
                                                toast.success('Downloading PDF...');
                                            } catch (e) { toast.error('PDF Export failed'); }
                                        }}>
                                            <FileText className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                            Export as PDF
                                        </DropdownMenuItem>
                                        {card.data && card.data.length > 0 && (
                                            <DropdownMenuItem onClick={() => {
                                                try {
                                                    ExportService.exportDataToCSV(card.data!, `${card.title.replace(/\s+/g, '_')}_data.csv`);
                                                    toast.success('CSV exported successfully');
                                                } catch (error) {
                                                    toast.error('Failed to export CSV');
                                                }
                                            }}>
                                                <Download className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                                Export Data (CSV)
                                            </DropdownMenuItem>
                                        )}
                                    </>
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

                </div>

                {/* Content */}
                <CardContent className="flex-1 p-4 overflow-hidden relative">
                    {card.type === 'visualization' ? (
                        <ChartVisualization
                            config={card.visualizationConfig || card.query?.visualizationConfig || {}}
                            data={card.data || []} // TODO: Pass real data
                            isLoading={false} // TODO: valid loading state
                            onDataClick={(params) => onChartClick?.(params, card.id)}
                            chartId={card.id}
                            activeFilters={activeFilters}
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
                {/* Resize Handle only in edit mode */}
            </Card>

            {
                card.type === 'visualization' && (
                    <AIExplainDialog
                        open={isExplainOpen}
                        onOpenChange={setIsExplainOpen}
                        title={card.title}
                        data={card.data || []}
                    />
                )
            }
        </>
    );
}
