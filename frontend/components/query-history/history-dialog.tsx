'use client';

import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    History,
    Search,
    CheckCircle2,
    AlertCircle,
    Play,
    Copy,
    Trash2,
    Trash,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQueryHistory } from '@/hooks/use-query-history';

interface HistoryDialogProps {
    onSelectQuery: (sql: string) => void;
    trigger?: React.ReactNode;
}

export function HistoryDialog({ onSelectQuery, trigger }: HistoryDialogProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const { history, loadHistory, deleteHistoryItem, clearHistory } = useQueryHistory();

    // Load history when dialog opens
    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) {
            loadHistory();
        }
    };

    const filteredHistory = useMemo(() => {
        return history.filter((item) => {
            // Status Match
            if (statusFilter !== 'all' && item.status !== statusFilter) return false;

            // Search Match
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    item.sql.toLowerCase().includes(query) ||
                    item.aiPrompt?.toLowerCase().includes(query)
                );
            }

            return true;
        });
    }, [history, searchQuery, statusFilter]);

    const handleCopy = (sql: string) => {
        navigator.clipboard.writeText(sql);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <History className="w-4 h-4 mr-2" />
                        History
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Query History
                    </DialogTitle>
                    <DialogDescription>
                        View and manage your recent query executions.
                    </DialogDescription>
                </DialogHeader>

                {/* Filters */}
                <div className="flex items-center gap-2 py-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search SQL or prompts..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="success">Success</SelectItem>
                            <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                            if (confirm('Are you sure you want to clear all history?')) {
                                clearHistory();
                            }
                        }}
                        title="Clear all history"
                    >
                        <Trash className="w-4 h-4" />
                    </Button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                            <History className="w-8 h-8 mb-2 opacity-50" />
                            <p>No history found</p>
                        </div>
                    ) : (
                        filteredHistory.map((item) => (
                            <div
                                key={item.id}
                                className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs">
                                        {item.status === 'success' ? (
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/10 dark:text-green-400 dark:border-green-900">
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                Success
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900">
                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                Error
                                            </Badge>
                                        )}
                                        <span className="text-muted-foreground">
                                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                                        </span>
                                        {item.executionTime > 0 && (
                                            <span className="text-muted-foreground">
                                                • {item.executionTime}ms
                                            </span>
                                        )}
                                        {item.rowsReturned > 0 && (
                                            <span className="text-muted-foreground">
                                                • {item.rowsReturned} rows
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleCopy(item.sql)}
                                            title="Copy SQL"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => deleteHistoryItem(item.id)}
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-8 gap-1 ml-1"
                                            onClick={() => {
                                                onSelectQuery(item.sql);
                                                setOpen(false);
                                            }}
                                        >
                                            <Play className="w-3 h-3" />
                                            Run
                                        </Button>
                                    </div>
                                </div>

                                {item.aiPrompt && (
                                    <div className="text-sm italic text-muted-foreground">
                                        "{item.aiPrompt}"
                                    </div>
                                )}

                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto font-mono text-foreground/80">
                                    {item.sql}
                                </pre>

                                {item.error && (
                                    <div className="text-xs text-red-500 flex items-start gap-1">
                                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                        {item.error}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
