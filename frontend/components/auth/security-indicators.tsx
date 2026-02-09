'use client';

import * as React from 'react';
import { Shield, Lock, CheckCircle2 } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export function SecurityIndicators() {
    return (
        <TooltipProvider delayDuration={300}>
            <div className="flex items-center justify-center gap-4 pt-4 pb-2 border-t">
                {/* SSL/HTTPS Indicator */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
                            <Lock className="h-3 w-3 text-green-600 dark:text-green-500" />
                            <span>Secure Connection</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs">
                            Your connection is encrypted with industry-standard TLS 1.3 protocol
                        </p>
                    </TooltipContent>
                </Tooltip>

                {/* Compliance Indicator */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
                            <Shield className="h-3 w-3 text-blue-600 dark:text-blue-500" />
                            <span>SOC 2</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs">
                            SOC 2 Type II certified for data security, availability, and confidentiality
                        </p>
                    </TooltipContent>
                </Tooltip>

                {/* GDPR Indicator */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
                            <CheckCircle2 className="h-3 w-3 text-purple-600 dark:text-purple-500" />
                            <span>GDPR</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs">
                            Fully compliant with EU General Data Protection Regulation (GDPR)
                        </p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}
