import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { ApiResponse, ConsultBusinessResponse, ProfileConsultRequestData } from '@/types/api';

const PROFILE_APP_ID = 'linkchat';
const PROFILE_SUBJECT_ID = 'test-user-001';
const PROFILE_ANALYSIS_TYPE = 'astrology';

export const useProfileConsult = () => {
    return useMutation({
        mutationFn: async (data: ProfileConsultRequestData) => {
            const response = await api.post<never, ApiResponse<ConsultBusinessResponse>>('/profile-consult', {
                appId: PROFILE_APP_ID,
                builderId: data.builderId,
                subjectProfile: {
                    subjectId: PROFILE_SUBJECT_ID,
                    analysisPayloads: [
                        {
                            analysisType: PROFILE_ANALYSIS_TYPE,
                            payload: data.payload,
                        },
                    ],
                },
                text: data.text ?? '',
                mode: data.mode,
            });

            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Profile consult request failed');
            }

            return response.data;
        },
    });
};
