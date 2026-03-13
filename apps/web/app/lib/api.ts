import type { AxiosInstance, AxiosResponse } from "axios";
import axios from "axios";

const envApiBaseUrl = import.meta.env.VITE_API_URL?.trim();

const API_BASE_URL =
  envApiBaseUrl && (!import.meta.env.PROD || !envApiBaseUrl.includes("localhost"))
    ? envApiBaseUrl
    : import.meta.env.DEV
      ? "http://localhost:3000/api/v1"
      : "/api/v1";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  traceId?: string;
}

export interface LoginResponseData {
  token: string;
  user: User;
}

export interface TimelineResponse {
  data: Memo[];
  nextCursor?: {
    createdAt: string;
    id: string;
  };
}

export interface UploadUrlResponse {
  uploadUrl: string;
  signature: string;
  path: string;
  headers?: {
    token: string;
  };
}

export interface UserResourcesResponse {
  resources: Resource[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
}

export interface Memo {
  id: string;
  content: string;
  userId: string;
  author: User;
  parentId?: string | null;
  quoteId?: string | null;
  quotedMemo?: Memo | null;
  visibility: "public" | "private";
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  path: string;
  resources?: Resource[];
  replies?: Memo[];
}

export interface Resource {
  id: string;
  filename: string;
  type: string;
  size: number;
  externalLink: string;
  provider: string;
  path: string;
  createdAt: string;
  memoId?: string | null;
  userId: string;
}

export interface MemoParams {
  limit?: number;
  cursorCreatedAt?: string;
  cursorId?: string;
  username?: string;
  date?: string;
  parentId?: string;
}

export interface CreateMemoData {
  content: string;
  visibility?: "public" | "private";
  parentId?: string;
  quoteId?: string;
  resources?: string[];
  isPinned?: boolean;
  createdAt?: string;
}

export interface UpdateMemoData {
  content?: string;
  visibility?: "public" | "private";
  isPinned?: boolean;
  resources?: string[];
  quoteId?: string | null;
  createdAt?: string;
}

export interface LoginData {
  login: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface UpdateProfileData {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface UploadUrlParams {
  fileType: string;
  ext: string;
}

export interface RecordUploadData {
  path: string;
  fileType: string;
  fileSize: number;
  filename: string;
  signature: string;
}

type TypedAxiosInstance = AxiosInstance & {
  get<TData = any, TResponse = AxiosResponse<ApiResponse<TData>>>(
    url: string,
    config?: Parameters<AxiosInstance["get"]>[1]
  ): Promise<TResponse>;
  post<TData = any, TRequest = any>(
    url: string,
    data?: TRequest,
    config?: Parameters<AxiosInstance["post"]>[2]
  ): Promise<AxiosResponse<ApiResponse<TData>>>;
  patch<TData = any, TRequest = any>(
    url: string,
    data?: TRequest,
    config?: Parameters<AxiosInstance["patch"]>[2]
  ): Promise<AxiosResponse<ApiResponse<TData>>>;
  delete<TData = any>(
    url: string,
    config?: Parameters<AxiosInstance["delete"]>[1]
  ): Promise<AxiosResponse<ApiResponse<TData>>>;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
}) as TypedAxiosInstance;

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  getMe: (): Promise<AxiosResponse<ApiResponse<User>>> =>
    apiClient.get("/auth/me"),

  login: (
    data: LoginData
  ): Promise<AxiosResponse<ApiResponse<LoginResponseData>>> =>
    apiClient.post("/auth/login", data),

  register: (
    data: RegisterData
  ): Promise<AxiosResponse<ApiResponse<LoginResponseData>>> =>
    apiClient.post("/auth/register", data),

  updateProfile: (
    data: UpdateProfileData
  ): Promise<AxiosResponse<ApiResponse<User>>> =>
    apiClient.patch("/auth/me", data),
};

export interface MemoStats {
  date: string;
  count: number;
}

export const memosAPI = {
  getStats: (username?: string): Promise<AxiosResponse<ApiResponse<MemoStats[]>>> =>
    apiClient.get("/memos/stats", { params: { username } }),

  getTimeline: (
    params?: MemoParams
  ): Promise<AxiosResponse<ApiResponse<TimelineResponse>>> =>
    apiClient.get("/memos/timeline", { params }),

  getMemo: (id: string): Promise<AxiosResponse<ApiResponse<Memo>>> =>
    apiClient.get(`/memos/${id}`),

  createMemo: (
    data: CreateMemoData
  ): Promise<AxiosResponse<ApiResponse<Memo>>> =>
    apiClient.post("/memos/publish", data),

  updateMemo: (
    id: string,
    data: UpdateMemoData
  ): Promise<AxiosResponse<ApiResponse<boolean>>> =>
    apiClient.patch(`/memos/${id}`, data),

  deleteMemo: (id: string): Promise<AxiosResponse<ApiResponse<boolean>>> =>
    apiClient.delete(`/memos/${id}`),

  searchMemos: (keyword: string): Promise<AxiosResponse<ApiResponse<Memo[]>>> =>
    apiClient.get("/memos/search", { params: { keyword } }),
};

export const resourcesAPI = {
  getUploadUrl: (
    fileType: string,
    ext: string
  ): Promise<AxiosResponse<ApiResponse<UploadUrlResponse>>> =>
    apiClient.get("/resources/upload-url", { params: { fileType, ext } }),

  recordUpload: (
    data: RecordUploadData
  ): Promise<AxiosResponse<ApiResponse<Resource>>> =>
    apiClient.post("/resources/record-upload", data),

  getUserResources: (): Promise<
    AxiosResponse<ApiResponse<UserResourcesResponse>>
  > => apiClient.get("/resources/user-all"),
};
