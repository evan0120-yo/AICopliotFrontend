import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { BuilderTemplateRequest, BuilderTemplateResponse } from '@/types/admin';

export const useTemplateLibrary = (enabled = true) => {
    return useQuery({
        queryKey: ['templateLibrary'],
        queryFn: async () => {
            const response = await api.get<never, ApiResponse<BuilderTemplateResponse[]>>('/admin/templates');
            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Failed to load template library');
            }
            return response.data;
        },
        enabled,
    });
};

export const useCreateTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: BuilderTemplateRequest) => {
            const response = await api.post<never, ApiResponse<BuilderTemplateResponse>>('/admin/templates', data);
            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Failed to create template');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templateLibrary'] });
            queryClient.invalidateQueries({ queryKey: ['builderTemplates'] });
        },
    });
};

export const useUpdateTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ templateId, data }: { templateId: number; data: BuilderTemplateRequest }) => {
            const response = await api.put<never, ApiResponse<BuilderTemplateResponse>>(`/admin/templates/${templateId}`, data);
            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Failed to update template');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templateLibrary'] });
            queryClient.invalidateQueries({ queryKey: ['builderTemplates'] });
            queryClient.invalidateQueries({ queryKey: ['builderGraph'] });
        },
    });
};

export const useDeleteTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (templateId: number) => {
            const response = await api.delete<never, ApiResponse<null>>(`/admin/templates/${templateId}`);
            if (!response.success) {
                throw new Error(response.error?.message || 'Failed to delete template');
            }
            return templateId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templateLibrary'] });
            queryClient.invalidateQueries({ queryKey: ['builderTemplates'] });
            queryClient.invalidateQueries({ queryKey: ['builderGraph'] });
        },
    });
};
