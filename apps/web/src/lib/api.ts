const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

type FetchOptions = RequestInit & {
  token?: string;
};

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, headers, ...rest } = options;

  const config: RequestInit = {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  console.log("url", `${BASE_URL}${path}`);

  const response = await fetch(`${BASE_URL}${path}`, config);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API Error: ${response.status}`);
  }

  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
