import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 600000,
});

api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.data?.error?.message) {
            return Promise.reject(new Error(error.response.data.error.message));
        }
        if (error instanceof Error) {
            return Promise.reject(error);
        }
        return Promise.reject(new Error('未知錯誤'));
    }
);

export default api;
