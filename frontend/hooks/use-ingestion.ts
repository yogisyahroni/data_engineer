'use client';

import { useMutation } from '@tanstack/react-query';
import { ingestionApi } from '@/lib/api/ingestion';
import { toast } from 'sonner';
import type { IngestionRequest, IngestionPreviewRequest } from '@/lib/types/batch2';

export function useIngestion() {
    // Mutation: Preview Ingestion
    const previewMutation = useMutation({
        mutationFn: ingestionApi.preview,
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Mutation: Ingest Data
    const ingestMutation = useMutation({
        mutationFn: ingestionApi.ingest,
        onSuccess: () => {
            toast.success('Data ingestion started successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    return {
        // Loading states
        isPreviewing: previewMutation.isPending,
        isIngesting: ingestMutation.isPending,

        // Error
        error: previewMutation.error?.message || ingestMutation.error?.message || null,

        // Mutation methods (wrapped for backward compatibility)
        previewIngest: async (request: IngestionPreviewRequest) => {
            try {
                const preview = await previewMutation.mutateAsync(request);
                return { success: true, data: preview };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },

        ingestData: async (request: IngestionRequest) => {
            try {
                const result = await ingestMutation.mutateAsync(request);
                return { success: true, data: result };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
    };
}
