'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    isResolved: boolean;
    user: { name: string; email: string; image?: string };
    replies: Comment[];
}

export function CommentThread({ cardId }: { cardId: string }) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchComments = async () => {
        try {
            const res = await fetch(`/api/comments?cardId=${cardId}`);
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [cardId]);

    const handlePost = async () => {
        if (!newComment.trim()) return;

        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newComment, dashboardCardId: cardId })
            });

            if (res.ok) {
                setNewComment('');
                fetchComments(); // Reload to show new
            } else {
                toast.error('Failed to post');
            }
        } catch (e) {
            toast.error('Network error');
        }
    };

    const handleResolve = async (commentId: string, currentStatus: boolean) => {
        try {
            await fetch('/api/comments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: commentId, isResolved: !currentStatus })
            });
            fetchComments();
        } catch (e) {
            toast.error('Error updating status');
        }
    };

    if (isLoading) return <div className="p-4 text-center text-xs">Loading discussions...</div>;

    return (
        <div className="flex flex-col h-[400px]">
            <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" /> Discussion
                </h3>
                <span className="text-xs text-muted-foreground">{comments.length} threads</span>
            </div>

            <ScrollArea className="flex-1 p-4">
                {comments.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 text-sm">
                        No comments yet. Start a discussion!
                    </div>
                ) : (
                    <div className="space-y-6">
                        {comments.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={comment.user.image} />
                                    <AvatarFallback>{comment.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold">{comment.user.name}</span>
                                        <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt))} ago</span>
                                    </div>
                                    <div className={`text-sm p-2 rounded bg-gray-100 ${comment.isResolved ? 'opacity-50' : ''}`}>
                                        {comment.content}
                                    </div>

                                    <div className="flex gap-2 pt-1 text-xs text-muted-foreground">
                                        <button
                                            className={`hover:text-green-600 flex items-center ${comment.isResolved ? 'text-green-600' : ''}`}
                                            onClick={() => handleResolve(comment.id, comment.isResolved)}
                                        >
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            {comment.isResolved ? 'Resolved' : 'Resolve'}
                                        </button>
                                    </div>

                                    {/* Replies would go here recursively (omitted for MVP brevity) */}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            <div className="p-3 border-t">
                <div className="flex gap-2">
                    <Textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Type a comment..."
                        className="min-h-[40px] text-sm resize-none"
                    />
                    <Button size="icon" onClick={handlePost}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
