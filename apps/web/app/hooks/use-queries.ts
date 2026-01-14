import {
  useQuery,
  useMutation,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { authAPI, memosAPI, resourcesAPI } from "~/lib/api";
import type { AxiosResponse } from "axios";
import type { CreateMemoData, UpdateMemoData, MemoParams } from "~/lib/api";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  traceId?: string;
}

interface LoginResponseData {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
  };
}

export const useUser = () => {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) return null;

      try {
        const response = await authAPI.updateProfile({});
        return response.data.data;
      } catch (error) {
        localStorage.removeItem("token");
        return null;
      }
    },
    retry: false,
    staleTime: Infinity,
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authAPI.login,
    onSuccess: (response: AxiosResponse<ApiResponse<LoginResponseData>>) => {
      localStorage.setItem("token", response.data.data.token);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authAPI.register,
    onSuccess: (response: AxiosResponse<ApiResponse<LoginResponseData>>) => {
      localStorage.setItem("token", response.data.data.token);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem("token");
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

const memoKeys = {
  all: ["memos"] as const,
  lists: () => [...memoKeys.all, "list"] as const,
  list: (filter: MemoParams | undefined) =>
    [...memoKeys.lists(), filter] as const,
  detail: (id: string) => [...memoKeys.all, "detail", id] as const,
  search: (keyword: string) => [...memoKeys.all, "search", keyword] as const,
};

export const memoOptions = (params?: MemoParams) =>
  queryOptions({
    queryKey: memoKeys.list(params),
    queryFn: async () => memosAPI.getTimeline(params),
  });

export const useMemos = (params?: MemoParams) => {
  return useQuery(memoOptions(params));
};

export const useMemo = (id: string) => {
  return useQuery({
    queryKey: memoKeys.detail(id),
    queryFn: () => memosAPI.getMemo(id),
  });
};

export const useCreateMemo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: memosAPI.createMemo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoKeys.lists() });
    },
  });
};

export const useUpdateMemo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMemoData }) =>
      memosAPI.updateMemo(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memoKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: memoKeys.lists() });
    },
  });
};

export const useDeleteMemo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: memosAPI.deleteMemo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoKeys.lists() });
    },
  });
};

export const useSearchMemos = (keyword: string) => {
  return useQuery({
    queryKey: memoKeys.search(keyword),
    queryFn: () => memosAPI.searchMemos(keyword),
    enabled: keyword.length >= 2,
  });
};

export const useGetUploadUrl = () => {
  return useMutation({
    mutationFn: ({ fileType, ext }: { fileType: string; ext: string }) =>
      resourcesAPI.getUploadUrl(fileType, ext),
  });
};

export const useRecordUpload = () => {
  return useMutation({
    mutationFn: resourcesAPI.recordUpload,
  });
};

export const useUserResources = () => {
  return useQuery({
    queryKey: ["resources"],
    queryFn: resourcesAPI.getUserResources,
  });
};
