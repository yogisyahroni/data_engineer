import { useQuery } from '@tanstack/react-query';

// Temporary mock data source type
export interface DataSource {
    id: string;
    name: string;
    type: string;
    status: 'active' | 'inactive';
}

// Mock data sources - replace with actual API call when available
const mockDataSources: DataSource[] = [
    {
        id: '1',
        name: 'Production Database',
        type: 'PostgreSQL',
        status: 'active',
    },
    {
        id: '2',
        name: 'Analytics Warehouse',
        type: 'Snowflake',
        status: 'active',
    },
    {
        id: '3',
        name: 'Customer Data',
        type: 'MySQL',
        status: 'active',
    },
];

/**
 * Hook to fetch data sources
 * TODO: Replace with actual API call when data sources endpoint is implemented
 */
export function useDataSources() {
    return useQuery({
        queryKey: ['data-sources'],
        queryFn: async () => {
            // Simulate API delay
            await new Promise((resolve) => setTimeout(resolve, 300));
            return {
                data: mockDataSources,
                total: mockDataSources.length,
            };
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
