import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { ApiResponse, LineTaskConsultRequestData, LineTaskConsultResponse } from '@/types/api';

export const useLineTaskConsult = () => {
    return useMutation({
        mutationFn: async (data: LineTaskConsultRequestData) => {
            const response = await api.post<never, ApiResponse<LineTaskConsultResponse>>('/line-task-consult', {
                appId: data.appId?.trim() || '',
                builderId: data.builderId,
                messageText: data.messageText,
                referenceTime: data.referenceTime,
                timeZone: data.timeZone,
            });

            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Line task consult request failed');
            }

            return response.data;
        },
    });
};
