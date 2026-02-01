'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check, User, Sparkles, Clock, Coins, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessageProps {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    tokensUsed?: number;
    cost?: number;
    isStreaming?: boolean;
    onRegenerate?: () => void;
    className?: string;
}

export function ChatMessage({
    role,
    content,
    timestamp,
    tokensUsed,
    cost,
    isStreaming,
    onRegenerate,
    className,
}: ChatMessageProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            toast.success('Message copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error('Failed to copy message');
        }
    };

    const isUser = role === 'user';

    return (
        <div
            className={cn(
                'group flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-500',
                isUser ? 'flex-row-reverse' : 'flex-row',
                className
            )}
        >
            {/* Avatar */}
            <div
                className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                    isUser
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                )}
            >
                {isUser ? (
                    <User className="w-4 h-4 text-white" />
                ) : (
                    <Sparkles className="w-4 h-4 text-white" />
                )}
            </div>

            {/* Message Content */}
            <div className={cn('flex flex-col gap-2 max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
                {/* Message Bubble */}
                <div
                    className={cn(
                        'relative px-4 py-3 rounded-2xl backdrop-blur-lg border transition-all duration-300',
                        isUser
                            ? 'bg-gradient-to-br from-blue-500/10 to-purple-600/10 border-blue-500/20 hover:border-blue-500/40'
                            : 'bg-card/50 border-border/50 hover:border-border'
                    )}
                >
                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                'h-6 w-6',
                                isUser ? 'text-blue-400 hover:text-blue-300' : 'text-muted-foreground'
                            )}
                            onClick={handleCopy}
                        >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>

                        {!isUser && onRegenerate && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground"
                                onClick={onRegenerate}
                                disabled={isStreaming}
                            >
                                <RotateCw className={cn('w-3 h-3', isStreaming && 'animate-spin')} />
                            </Button>
                        )}
                    </div>

                    {/* Message Text with Markdown */}
                    <div className="pr-16">
                        {isUser ? (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {content}
                            </p>
                        ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown
                                    components={{
                                        code({ className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const isInline = !match;

                                            return !isInline ? (
                                                <SyntaxHighlighter
                                                    style={oneDark as any}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    className="rounded-md text-xs my-2"
                                                >
                                                    {String(children).replace(/\n$/, '')}
                                                </SyntaxHighlighter>
                                            ) : (
                                                <code className={cn('px-1 py-0.5 rounded bg-muted text-xs font-mono', className)} {...props}>
                                                    {children}
                                                </code>
                                            );
                                        },
                                    }}
                                >
                                    {content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>

                {/* Metadata */}
                <div
                    className={cn(
                        'flex items-center gap-2 text-[10px] text-muted-foreground px-1',
                        isUser ? 'flex-row-reverse' : 'flex-row'
                    )}
                >
                    {/* Timestamp */}
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}</span>
                    </div>

                    {/* AI Metrics (only for assistant) */}
                    {!isUser && tokensUsed !== undefined && (
                        <>
                            <span className="text-muted-foreground/50">•</span>
                            <Badge
                                variant="outline"
                                className="h-4 px-1.5 text-[9px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            >
                                <Coins className="w-2.5 h-2.5 mr-1" />
                                {tokensUsed} tokens
                            </Badge>
                        </>
                    )}

                    {!isUser && cost !== undefined && cost > 0 && (
                        <Badge
                            variant="outline"
                            className="h-4 px-1.5 text-[9px] border-amber-500/30 text-amber-600 dark:text-amber-400"
                        >
                            ${cost.toFixed(4)}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
}
