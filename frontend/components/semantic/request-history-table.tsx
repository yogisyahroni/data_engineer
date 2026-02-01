'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChevronLeft, ChevronRight, Eye, Copy, Clock, Coins } from 'lucide-react';
import { useSemanticRequests } from '@/hooks/use-semantic';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon, Download } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface RequestHistoryTableProps {
    className?: string;
}

const REQUEST_TYPES = [
    { value: 'all', label: 'All Types' },
    { value: 'explain', label: 'Explain' },
    { value: 'query', label: 'Query' },
    { value: 'formula', label: 'Formula' },
    { value: 'chat', label: 'Chat' },
];

const ITEMS_PER_PAGE = 10;

export function RequestHistoryTable({ className }: RequestHistoryTableProps) {
    const [typeFilter, setTypeFilter] = React.useState('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [selectedRequest, setSelectedRequest] = React.useState<any>(null);
    const [date, setDate] = React.useState<DateRange | undefined>();

    const { data: requests, isLoading } = useSemanticRequests();

    // Filter requests
    const filteredRequests = React.useMemo(() => {
        if (!requests?.data) return [];

        return requests.data.filter((req: any) => {
            // Type filter
            if (typeFilter !== 'all' && req.type !== typeFilter) {
                return false;
            }

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    req.prompt?.toLowerCase().includes(query) ||
                    req.response?.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }

            // Date filter
            if (date?.from) {
                const reqDate = new Date(req.createdAt);
                const from = startOfDay(date.from);
                const to = date.to ? endOfDay(date.to) : endOfDay(date.from);

                if (!isWithinInterval(reqDate, { start: from, end: to })) {
                    return false;
                }
            }

            return true;
        });
    }, [requests, typeFilter, searchQuery, date]);

    // Pagination
    const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
    const paginatedRequests = filteredRequests.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleCopyPrompt = async (prompt: string) => {
        try {
            await navigator.clipboard.writeText(prompt);
            toast.success('Prompt copied to clipboard');
        } catch (error) {
            toast.error('Failed to copy prompt');
        }
    };

    const handleExportCSV = () => {
        if (!filteredRequests.length) {
            toast.error('No data to export');
            return;
        }

        const headers = ['ID', 'Type', 'Prompt', 'Response', 'Tokens', 'Cost', 'Date'];
        const csvContent = [
            headers.join(','),
            ...filteredRequests.map((req: any) => [
                req.id,
                req.type,
                `"${req.prompt?.replace(/"/g, '""') || ''}"`,
                `"${req.response?.replace(/"/g, '""') || ''}"`,
                req.tokensUsed || 0,
                req.cost || 0,
                new Date(req.createdAt).toISOString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `semantic_requests_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const truncate = (text: string, maxLength: number) => {
        if (!text) return '-';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    return (
        <>
            <Card
                className={cn(
                    'flex flex-col h-full bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-lg border-border/50',
                    className
                )}
            >
                {/* Header */}
                <div className="p-4 border-b border-border/50 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold">Request History</h3>
                            <p className="text-[10px] text-muted-foreground">
                                {filteredRequests.length} requests
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-7 text-xs">
                            <Download className="w-3 h-3 mr-1" />
                            Export CSV
                        </Button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-2">
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                {REQUEST_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value} className="text-xs">
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-8 justify-start text-left font-normal text-xs w-[200px]",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                {format(date.from, "LLL dd, y")} -{" "}
                                                {format(date.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(date.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>

                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <Input
                                placeholder="Search by prompt..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 pl-7 text-xs"
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="p-4 space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex gap-2">
                                    <Skeleton className="h-12 flex-1" />
                                </div>
                            ))}
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <Clock className="w-12 h-12 text-muted-foreground/50 mb-3" />
                            <p className="text-sm font-medium">No requests found</p>
                            <p className="text-xs text-muted-foreground">
                                {searchQuery || typeFilter !== 'all'
                                    ? 'Try adjusting your filters'
                                    : 'Start using AI features to see history'}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Type</TableHead>
                                    <TableHead className="w-[200px]">Prompt</TableHead>
                                    <TableHead className="w-[200px]">Response</TableHead>
                                    <TableHead className="w-[80px] text-right">Tokens</TableHead>
                                    <TableHead className="w-[80px] text-right">Cost</TableHead>
                                    <TableHead className="w-[120px]">Date</TableHead>
                                    <TableHead className="w-[60px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedRequests.map((req: any) => (
                                    <TableRow
                                        key={req.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => setSelectedRequest(req)}
                                    >
                                        <TableCell>
                                            <Badge variant="outline" className="text-[10px] capitalize">
                                                {req.type || 'chat'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {truncate(req.prompt, 40)}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {truncate(req.response, 40)}
                                        </TableCell>
                                        <TableCell className="text-xs text-right">
                                            {req.tokensUsed || '-'}
                                        </TableCell>
                                        <TableCell className="text-xs text-right">
                                            {req.cost ? `$${req.cost.toFixed(4)}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-[10px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(req.createdAt), {
                                                addSuffix: true,
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedRequest(req);
                                                }}
                                            >
                                                <Eye className="w-3 h-3" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-border/50 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft className="w-3 h-3" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronRight className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Details Modal */}
            <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Request Details
                            <Badge variant="outline" className="text-[10px] capitalize">
                                {selectedRequest?.type || 'chat'}
                            </Badge>
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {selectedRequest &&
                                formatDistanceToNow(new Date(selectedRequest.createdAt), {
                                    addSuffix: true,
                                })}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="space-y-4">
                            {/* Prompt */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium">Prompt</label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopyPrompt(selectedRequest.prompt)}
                                        className="h-6 text-xs"
                                    >
                                        <Copy className="w-3 h-3 mr-1" />
                                        Copy
                                    </Button>
                                </div>
                                <div className="p-3 rounded-md bg-muted text-xs">
                                    {selectedRequest.prompt}
                                </div>
                            </div>

                            {/* Response */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium">Response</label>
                                <div className="p-3 rounded-md bg-muted text-xs whitespace-pre-wrap">
                                    {selectedRequest.response}
                                </div>
                            </div>

                            {/* Generated SQL/Formula */}
                            {selectedRequest.generatedQuery && (
                                <div className="space-y-2">
                                    <label className="text-xs font-medium">Generated SQL</label>
                                    <SyntaxHighlighter
                                        language="sql"
                                        style={oneDark as any}
                                        customStyle={{
                                            margin: 0,
                                            borderRadius: '0.375rem',
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        {selectedRequest.generatedQuery}
                                    </SyntaxHighlighter>
                                </div>
                            )}

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4 p-3 rounded-md bg-muted/50">
                                <div>
                                    <p className="text-[10px] text-muted-foreground mb-1">Provider</p>
                                    <p className="text-xs font-medium">
                                        {selectedRequest.providerName || 'Unknown'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground mb-1">Tokens Used</p>
                                    <div className="flex items-center gap-1">
                                        <Coins className="w-3 h-3" />
                                        <p className="text-xs font-medium">
                                            {selectedRequest.tokensUsed || 0}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground mb-1">Cost</p>
                                    <p className="text-xs font-medium">
                                        ${(selectedRequest.cost || 0).toFixed(4)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground mb-1">Timestamp</p>
                                    <p className="text-xs font-medium">
                                        {new Date(selectedRequest.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
