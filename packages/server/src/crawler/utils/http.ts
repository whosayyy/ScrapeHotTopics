import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { createRandomHeaders } from "./headers.js";

export interface HttpClientOptions {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export function createHttpClient(opts: HttpClientOptions): AxiosInstance {
  const config: AxiosRequestConfig = {
    baseURL: opts.baseURL,
    timeout: opts.timeout ?? 15_000,
    headers: createRandomHeaders(),
    decompress: true,
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 400,
  };

  const client = axios.create(config);

  client.interceptors.request.use((cfg) => {
    cfg.headers = createRandomHeaders();
    return cfg;
  });

  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      const config = err.config as AxiosRequestConfig & { _retryCount?: number };
      if (!config) return Promise.reject(err);

      config._retryCount ??= 0;
      const maxRetries = opts.retries ?? 2;

      if (config._retryCount >= maxRetries) {
        return Promise.reject(err);
      }

      const status = err.response?.status;
      const shouldRetry = !status || status >= 500 || status === 429 || status === 0;
      if (!shouldRetry) return Promise.reject(err);

      config._retryCount++;

      const delay = (opts.retryDelay ?? 1000) * Math.pow(2, config._retryCount - 1);
      const jitter = Math.random() * 500;

      await new Promise((r) => setTimeout(r, delay + jitter));
      return client(config);
    },
  );

  return client;
}
