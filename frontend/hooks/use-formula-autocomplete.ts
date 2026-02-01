import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { semanticApi } from '@/lib/api/semantic';
import type { AutocompleteResponse } from '@/lib/types/semantic';

interface UseFormulaAutocompleteOptions {
    dataSourceId?: string;
    debounceMs?: number;
}

export function useFormulaAutocomplete(options: UseFormulaAutocompleteOptions = {}) {
    const { dataSourceId, debounceMs = 300 } = options;
    const [suggestions, setSuggestions] = useState<AutocompleteResponse | null>(null);

    const mutation = useMutation({
        mutationFn: ({ input, cursorPos }: { input: string; cursorPos: number }) =>
            semanticApi.formulaAutocomplete({
                input,
                cursorPos,
                dataSourceId,
            }),
        onSuccess: (data) => {
            setSuggestions(data);
        },
    });

    const getSuggestions = (input: string, cursorPos: number) => {
        if (!input || input.trim().length === 0) {
            setSuggestions(null);
            return;
        }

        mutation.mutate({ input, cursorPos });
    };

    return {
        suggestions,
        getSuggestions,
        isLoading: mutation.isPending,
        error: mutation.error,
        clearSuggestions: () => setSuggestions(null),
    };
}

// Hook with automatic debouncing
export function useDebouncedFormulaAutocomplete(
    input: string,
    cursorPos: number,
    options: UseFormulaAutocompleteOptions = {}
) {
    const { debounceMs = 300, ...restOptions } = options;
    const { getSuggestions, ...rest } = useFormulaAutocomplete({ debounceMs, ...restOptions });

    useEffect(() => {
        const handler = setTimeout(() => {
            getSuggestions(input, cursorPos);
        }, debounceMs);

        return () => clearTimeout(handler);
    }, [input, cursorPos, debounceMs, getSuggestions]);

    return rest;
}
