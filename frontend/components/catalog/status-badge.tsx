import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

type Status = 'draft' | 'verified' | 'deprecated' | string;

interface StatusBadgeProps {
    status: Status;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const s = status?.toLowerCase() || 'draft';

    if (s === 'verified') {
        return (
            <Badge variant="default" className={`bg-green-600 hover:bg-green-700 gap-1 ${className}`}>
                <CheckCircle2 className="w-3 h-3" />
                Verified
            </Badge>
        );
    }

    if (s === 'deprecated') {
        return (
            <Badge variant="destructive" className={`gap-1 ${className}`}>
                <AlertCircle className="w-3 h-3" />
                Deprecated
            </Badge>
        );
    }

    return (
        <Badge variant="secondary" className={`gap-1 text-muted-foreground ${className}`}>
            <Clock className="w-3 h-3" />
            Draft
        </Badge>
    );
}
