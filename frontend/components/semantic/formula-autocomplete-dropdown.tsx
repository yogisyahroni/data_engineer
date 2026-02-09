'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AutocompleteSuggestion } from '@/lib/types/semantic';
import { Code, Hash, Type, Terminal } from 'lucide-react';

interface FormulaAutocompleteDropdownProps {
    suggestions: AutocompleteSuggestion[];
    onSelect: (suggestion: AutocompleteSuggestion) => void;
    onClose: () => void;
    className?: string;
}

const TYPE_ICONS = {
    function: Terminal,
    operator: Hash,
    keyword: Code,
    column: Type,
};

const TYPE_COLORS = {
    function: 'text-purple-500',
    operator: 'text-blue-500',
    keyword: 'text-green-500',
    column: 'text-orange-500',
};

export function FormulaAutocompleteDropdown({
    suggestions,
    onSelect,
    onClose,
    className,
}: FormulaAutocompleteDropdownProps) {
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const itemRefs = React.useRef<(HTMLDivElement | null)[]>([]);

    // Group suggestions by category
    const groupedSuggestions = React.useMemo(() => {
        const groups: Record<string, AutocompleteSuggestion[]> = {};
        suggestions.forEach((suggestion) => {
            if (!groups[suggestion.category]) {
                groups[suggestion.category] = [];
            }
            groups[suggestion.category].push(suggestion);
        });
        return groups;
    }, [suggestions]);

    // Flatten suggestions for keyboard navigation
    const flatSuggestions = React.useMemo(() => {
        return suggestions;
    }, [suggestions]);

    // Keyboard navigation
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                        prev < flatSuggestions.length - 1 ? prev + 1 : prev
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (flatSuggestions[selectedIndex]) {
                        onSelect(flatSuggestions[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, flatSuggestions, onSelect, onClose]);

    // Scroll selected item into view
    React.useEffect(() => {
        const selectedItem = itemRefs.current[selectedIndex];
        if (selectedItem) {
            selectedItem.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
        }
    }, [selectedIndex]);

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <div
            ref={dropdownRef}
            className={cn(
                'absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg',
                className
            )}
        >
            <ScrollArea className="max-h-[300px]">
                <div className="p-1">
                    {Object.entries(groupedSuggestions).map(([category, items]) => (
                        <div key={category} className="mb-2 last:mb-0">
                            {/* Category Header */}
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
                                {category}
                            </div>

                            {/* Suggestions */}
                            {items.map((suggestion, categoryIndex) => {
                                const globalIndex = flatSuggestions.indexOf(suggestion);
                                const isSelected = globalIndex === selectedIndex;
                                const Icon = TYPE_ICONS[suggestion.type];
                                const iconColor = TYPE_COLORS[suggestion.type];

                                return (
                                    <div
                                        key={`${category}-${categoryIndex}`}
                                        ref={(el) => (itemRefs.current[globalIndex] = el)}
                                        className={cn(
                                            'px-2 py-2 rounded-sm cursor-pointer transition-colors',
                                            'hover:bg-accent',
                                            isSelected && 'bg-accent'
                                        )}
                                        onClick={() => onSelect(suggestion)}
                                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                                    >
                                        <div className="flex items-start gap-2">
                                            {/* Icon */}
                                            <Icon className={cn('w-4 h-4 mt-0.5', iconColor)} />

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                {/* Label and Type */}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold truncate">
                                                        {suggestion.label}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="h-4 px-1.5 text-[9px]"
                                                    >
                                                        {suggestion.type}
                                                    </Badge>
                                                </div>

                                                {/* Description */}
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    {suggestion.description}
                                                </p>

                                                {/* Signature (for functions) */}
                                                {suggestion.signature && (
                                                    <code className="text-[9px] text-purple-600 dark:text-purple-400 mt-1 block">
                                                        {suggestion.signature}
                                                    </code>
                                                )}

                                                {/* Example */}
                                                {isSelected && (
                                                    <div className="mt-2 p-2 rounded bg-muted/50">
                                                        <p className="text-[9px] text-muted-foreground mb-1">
                                                            Example:
                                                        </p>
                                                        <code className="text-[9px] font-mono">
                                                            {suggestion.example}
                                                        </code>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Keyboard Hints */}
            <div className="px-2 py-1.5 border-t border-border bg-muted/30">
                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span>↑↓ Navigate</span>
                    <span>Enter Select</span>
                    <span>Esc Close</span>
                </div>
            </div>
        </div>
    );
}
