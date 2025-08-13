export type UserOption = { id: string; email: string; name: string | null };

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : {};
}

export async function searchUsers(
  q: string,
  opts?: { limit?: number; signal?: AbortSignal }
): Promise<UserOption[]> {
  const query = q.trim();
  if (!query) return [];
  const limit = opts?.limit ?? 10;

  const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
    cache: "no-store",
    signal: opts?.signal,
  });
  if (!res.ok) {
    const body = await safeJson(res).catch(() => ({}));
    throw new Error(body?.error ? `HTTP ${res.status}: ${body.error}` : `HTTP ${res.status}`);
  }

  const data = await safeJson(res);
  if (!Array.isArray(data)) return [];
  return data.map((u: any) => ({ id: u.id, email: u.email, name: u.name ?? null }));
}
