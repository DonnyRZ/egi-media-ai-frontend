import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

import { env } from "@/shared/config/env";
import { useSessionStore } from "@/shared/session-store";

function createAxiosClient(): AxiosInstance {
  const client = axios.create({
    baseURL: env.apiUrl,
    timeout: 15_000,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = useSessionStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  return client;
}

export const axiosClient = createAxiosClient();
