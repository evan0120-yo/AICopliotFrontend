import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ApiResponse, BuilderSummary } from '@/types/api';

export const useGetBuilders = () => {
    return useQuery({
        queryKey: ['builders'],
        queryFn: async () => {
            const response = await api.get<never, ApiResponse<BuilderSummary[]>>('/builders');
            if (!response.success) {
                throw new Error(response.error?.message || 'Failed to fetch builders');
            }
            return response.data || [];
        },
    });
};
