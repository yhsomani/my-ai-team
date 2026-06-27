import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { supabase } from '../lib/supabaseClient';
import type { store as reduxStore } from '../store';
import { logout } from '../store/slices/authSlice';

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// =============================================================================
// 401 Race Condition Fix - Using Promise Queue Pattern
// =============================================================================

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
    config: InternalAxiosRequestConfig;
}> = [];
let requestInterceptorId: number | null = null;
let responseInterceptorId: number | null = null;

const processQueue = (error: AxiosError | null): void => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(prom.config);
        }
    });
    failedQueue = [];
};

export const setupInterceptors = (store: typeof reduxStore) => {
    if (requestInterceptorId !== null) {
        apiClient.interceptors.request.eject(requestInterceptorId);
    }

    if (responseInterceptorId !== null) {
        apiClient.interceptors.response.eject(responseInterceptorId);
    }

    // Request Interceptor: Attach Supabase JWT automatically
    requestInterceptorId = apiClient.interceptors.request.use(async (config) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
        }
        return config;
    }, (error) => {
        return Promise.reject(error);
    });

    // Response Interceptor: Global Error Handling & Auto-Logout (Race-Condition Safe)
    responseInterceptorId = apiClient.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
            const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

            // Handle 401 Unauthorized
            if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
                
                // If already refreshing, queue this request
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({
                            resolve,
                            reject,
                            config: originalRequest
                        });
                    })
                    .then((res) => apiClient(res as InternalAxiosRequestConfig))
                    .catch((err) => Promise.reject(err));
                }

                // Mark as retry and start refresh process
                originalRequest._retry = true;
                isRefreshing = true;

                console.warn("Session expired. Initiating secure logout...");

                // Clear Redux State and redirect
                store.dispatch(logout());
                
                // Process all queued requests with error
                processQueue(error);

                // Redirect to login if not already there
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }

                isRefreshing = false;
                
                return Promise.reject(error);
            }

            return Promise.reject(error.response?.data || error.message);
        }
    );
};

export default apiClient;
