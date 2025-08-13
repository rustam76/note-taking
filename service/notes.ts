import type {
  CreateNotePayload, CreateNoteResult, ShareChoice,
  ShareState, UpdateNotePayload, UserOption,
} from "@/types";

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export async function getNoteShareState(noteId: string): Promise<ShareState | undefined> {
  try {
    const res = await fetch(`/api/notes/${noteId}`, { method: "GET", cache: "no-store" });
    if (!res.ok) return;
    const j = await safeJson(res);
    const isPublic = !!j?.isPublic;
    const s = j?.publicLink?.slug as string | undefined;
    const coll = Array.isArray(j?.collaborators) ? j.collaborators : [];
    const first = coll[0]?.user
      ? { id: coll[0].user.id, email: coll[0].user.email, name: coll[0].user.name }
      : undefined;
    return { slug: s, mode: isPublic ? "public" : (first ? "team" : "private"), team: first };
  } catch {
    return;
  }
}

export async function createNote(
  payload: CreateNotePayload,
  opts?: { awaitSlug?: boolean; signal?: AbortSignal }
): Promise<CreateNoteResult> {
  const body: any = {
    title: payload.title,
    content: payload.content,
    color: payload.color ?? null,
    shareMode: payload.shareMode,
    ...(payload.shareMode === "team" ? { teamUserId: payload.teamUserId ?? null } : {}),
  };

  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

  const out: CreateNoteResult = { id: data?.id, slug: data?.slug };
  if (opts?.awaitSlug && payload.shareMode === "public" && !out.slug && out.id) {
    out.slug = (await waitForSlug(out.id)) ?? undefined;
  }
  return out;
}

export async function updateNote(
  noteId: string,
  payload: UpdateNotePayload,
  opts?: { awaitSlug?: boolean; signal?: AbortSignal }
): Promise<{ slug?: string }> {
  const body: any = {
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.content !== undefined ? { content: payload.content } : {}),
    ...(payload.color !== undefined ? { color: payload.color } : {}),
    ...(payload.shareMode !== undefined ? { shareMode: payload.shareMode } : {}),
    ...(payload.shareMode === "team" ? { teamUserId: payload.teamUserId ?? null } : { teamUserId: null }),
  };

  const res = await fetch(`/api/notes/${noteId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

  let slug: string | undefined = data?.slug;
  if (opts?.awaitSlug && payload.shareMode === "public" && !slug) {
    slug = (await waitForSlug(noteId)) ?? undefined;
  }
  return { slug };
}

export async function updateNoteShare(
  noteId: string,
  payload: { mode: ShareChoice; teamUserId?: string | null }
): Promise<{ slug?: string }> {
  const res = await fetch(`/api/notes/${noteId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      shareMode: payload.mode,
      teamUserId: payload.mode === "team" ? (payload.teamUserId ?? null) : null,
    }),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
  return j as { slug?: string };
}

export async function waitForSlug(
  noteId: string,
  { tries = 5, delayMs = 250 }: { tries?: number; delayMs?: number } = {}
): Promise<string | null> {
  for (let i = 0; i < tries; i++) {
    const latest = await getNoteShareState(noteId);
    if (latest?.slug) return latest.slug;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

export async function deleteNote(noteId: string) {
  const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `HTTP ${res.status}`);
  }
}

export async function searchUsers(q: string, signal?: AbortSignal): Promise<UserOption[]> {
  const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=10`, {
    signal, cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await safeJson(res);
  return Array.isArray(data) ? data : [];
}
