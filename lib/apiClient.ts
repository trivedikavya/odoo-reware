export async function apiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers:
      options?.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json", ...(options?.headers ?? {}) }
        : options?.headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }
  return data as T;
}
