import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ApiResponse } from '@/types/api';
import { BuilderGraphRequest, BuilderGraphResponse, BuilderTemplateResponse } from '@/types/admin';

export const useBuilderGraph = (builderId: number) => {
    return useQuery({
        queryKey: ['builderGraph', builderId],
        queryFn: async () => {
            const response = await api.get<never, ApiResponse<BuilderGraphResponse>>(
                `/admin/builders/${builderId}/graph`,
            );
            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Failed to load builder graph');
            }
            return response.data;
        },
        enabled: !Number.isNaN(builderId),
    });
};

export const useSaveBuilderGraph = (builderId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: BuilderGraphRequest) => {
            const response = await api.put<never, ApiResponse<BuilderGraphResponse>>(
                `/admin/builders/${builderId}/graph`,
                data,
            );
            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Failed to save builder graph');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['builderGraph', builderId] });
        },
    });
};

export const useBuilderTemplates = (builderId: number, enabled = true) => {
    return useQuery({
        queryKey: ['builderTemplates', builderId],
        queryFn: async () => {
            const response = await api.get<never, ApiResponse<BuilderTemplateResponse[]>>(
                `/admin/builders/${builderId}/templates`,
            );
            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Failed to load builder templates');
            }
            return response.data;
        },
        enabled: enabled && !Number.isNaN(builderId),
    });
};
