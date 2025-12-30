export interface User {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
}

export interface Resource {
  id: string;
  type: string;
  externalLink: string;
  filename: string;
  fileSize: number;
}

export interface Memo {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  visibility: "public" | "private";
  author: {
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  resources?: Resource[];
  replies?: Memo[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  path: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
