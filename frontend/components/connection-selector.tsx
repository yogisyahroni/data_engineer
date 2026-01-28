'use client';

import { useConnections } from '@/hooks/use-connections';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database } from 'lucide-react';

interface ConnectionSelectorProps {
    value?: string;
    onValueChange: (value: string) => void;
}

export function ConnectionSelector({ value, onValueChange }: ConnectionSelectorProps) {
    const { connections, isLoading } = useConnections({ userId: 'user_123' }); // TODO: real auth

    return (
        <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <Select value={value} onValueChange={onValueChange} disabled={isLoading}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={isLoading ? "Loading..." : "Select Database"} />
                </SelectTrigger>
                <SelectContent>
                    {connections.map((conn) => (
                        <SelectItem key={conn.id} value={conn.id}>
                            {conn.name} ({conn.type})
                        </SelectItem>
                    ))}
                    {connections.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                            No connections found
                        </div>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}
