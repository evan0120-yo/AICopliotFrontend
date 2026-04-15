import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { ApiResponse, LineTaskConsultRequestData, LineTaskConsultResponse } from '@/types/api';

export const useLineTaskConsult = () => {
    return useMutation({
        mutationFn: async (data: LineTaskConsultRequestData) => {
            const requestBody: LineTaskConsultRequestData = {
                appId: data.appId?.trim() || '',
                builderId: data.builderId,
                messageText: data.messageText,
            };
            if (data.referenceTime?.trim()) {
                requestBody.referenceTime = data.referenceTime;
            }
            if (data.timeZone?.trim()) {
                requestBody.timeZone = data.timeZone;
            }

            const response = await api.post<never, ApiResponse<LineTaskConsultResponse>>('/line-task-consult', requestBody);

            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Line task consult request failed');
            }

            return response.data;
        },
    });
};
