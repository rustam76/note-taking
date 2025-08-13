"use client";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useSession, signIn } from "next-auth/react";
import { usePublicComments } from "@/hooks/usePublicComments";

export default function PublicComments({ noteId }: { noteId: string }) {
  const { data: session } = useSession();
  const { comments, err, loading, load, add, listRef } = usePublicComments(noteId);
  const [body, setBody] = useState("");
  async function handleAdd() {
    if (!session?.user) {
      const cb = typeof window !== "undefined" ? window.location.pathname : "/p";
      signIn(undefined, { callbackUrl: cb });
      return;
    }
    await add(body);
    setBody("");
  }

  return (
    <div className="bg-white/90 backdrop-blur rounded-xl shadow p-5">
      <h2 className="text-lg font-semibold mb-3">Comments</h2>

      <div className="mb-4 space-y-2">
        <Textarea
          placeholder={session?.user ? "Tulis komentar…" : "Login untuk berkomentar"}
          disabled={!session?.user || loading}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex gap-2">
          {session?.user ? (
            <Button onClick={handleAdd} disabled={loading || !body.trim()}>
              {loading ? "Saving..." : "Kirim"}
            </Button>
          ) : (
            <Button
              onClick={() => {
                const cb = typeof window !== "undefined" ? window.location.pathname : "/p";
                signIn(undefined, { callbackUrl: cb });
              }}
            >
              Login untuk komentar
            </Button>
          )}
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>

      <div ref={listRef} className="space-y-3 max-h-[420px] overflow-auto">
        {comments.length === 0 && (
          <p className="text-sm text-gray-500">Belum ada komentar.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="border rounded-lg p-3 bg-white">
            <div className="text-xs text-gray-500">
              {new Date(c.createdAt).toLocaleString()}
            </div>
            <div className="font-medium text-sm">{c.authorName}</div>
            <div className="text-sm whitespace-pre-wrap">{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
