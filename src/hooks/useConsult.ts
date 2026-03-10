import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { ApiResponse, ConsultBusinessResponse, ConsultRequestData } from '@/types/api';

export const useConsult = () => {
    return useMutation({
        mutationFn: async (data: ConsultRequestData) => {
            const formData = new FormData();
            formData.append('builderId', data.builderId.toString());
            if (typeof data.text === 'string') {
                formData.append('text', data.text);
            }
            if (data.outputFormat) {
                formData.append('outputFormat', data.outputFormat);
            }
            if (data.files) {
                data.files.forEach((file) => {
                    formData.append('files', file);
                });
            }

            const response = await api.post<never, ApiResponse<ConsultBusinessResponse>>('/consult', formData);

            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Consult request failed');
            }

            return response.data;
        },
    });
};
