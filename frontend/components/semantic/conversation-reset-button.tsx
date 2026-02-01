'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface ConversationResetButtonProps {
    onReset: () => void;
    disabled?: boolean;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    showLabel?: boolean;
    className?: string;
}

export function ConversationResetButton({
    onReset,
    disabled = false,
    variant = 'outline',
    size = 'sm',
    showLabel = true,
    className,
}: ConversationResetButtonProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    const handleReset = () => {
        onReset();
        setIsOpen(false);
        toast.success('Conversation reset successfully', {
            description: 'Starting a fresh conversation',
        });
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant={variant}
                    size={size}
                    disabled={disabled}
                    className={className}
                >
                    <RotateCcw className="w-4 h-4" />
                    {showLabel && size !== 'icon' && (
                        <span className="ml-2">Reset Conversation</span>
                    )}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Reset Conversation?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will clear the current conversation history and start a fresh chat.
                        This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>
                        Reset Conversation
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
