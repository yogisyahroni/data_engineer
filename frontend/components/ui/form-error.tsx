'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormErrorProps extends React.HTMLAttributes<HTMLDivElement> {
    message?: string;
    id?: string;
}

const FormError = React.forwardRef<HTMLDivElement, FormErrorProps>(
    ({ message, id, className, ...props }, ref) => {
        if (!message) return null;

        return (
            <div
                ref={ref}
                id={id}
                role="alert"
                aria-live="polite"
                className={cn(
                    'flex items-start gap-2 text-sm text-destructive animate-in fade-in-50 slide-in-from-top-1 duration-200',
                    className
                )}
                {...props}
            >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{message}</span>
            </div>
        );
    }
);

FormError.displayName = 'FormError';

export { FormError };
