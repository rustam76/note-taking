import { Comment } from "@/types";

export async function fetchComments(noteId: string, signal?: AbortSignal) {
  const res = await fetch(`/api/notes/${noteId}/comments`, {
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `Load failed (${res.status})`);
  }
  const data = (await res.json()) as Comment[];
  return data.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function postComment(noteId: string, body: string) {
  const res = await fetch(`/api/notes/${noteId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `Post failed (${res.status})`);
  }
  return (await res.json()) as Comment;
}
