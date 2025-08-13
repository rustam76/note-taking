"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { NoteDialog } from "@/components/add-notes";
import { NoteCard } from "@/components/note-card";
import { useRouter } from "next/navigation";
import { NoteItem } from "@/types";

type Cursor = { updatedAt: string; id: string } | null;

export default function NotesGrid({
  initialNotes,
  initialCursor,
}: {
  initialNotes: NoteItem[];
  initialCursor: Cursor;
}) {
  const router = useRouter();

  const [notes, setNotes] = useState<NoteItem[]>(initialNotes);
  const [nextCursor, setNextCursor] = useState<Cursor>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // >>> Sinkronisasi props -> state saat server refresh <<<
  useEffect(() => {
    setNotes(initialNotes);
    setNextCursor(initialCursor);
  }, [initialNotes, initialCursor]);

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) || null,
    [selectedId, notes]
  );

  function openFor(noteId: string) {
    setSelectedId(noteId);
    setDialogOpen(true);
  }

  async function onDelete(id: string) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
    router.refresh(); // agar cursor & count akurat
  }

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/notes?limit=10&cursor=${encodeURIComponent(
          JSON.stringify(nextCursor)
        )}`
      );
      const json = await res.json();

      const mapped: NoteItem[] = (json.items as any[]).map((n) => {
        const dateLabel = new Date(n.updatedAt).toLocaleDateString();
        const timeLabel = new Date(n.updatedAt).toLocaleTimeString();
        return {
          id: n.id,
          title: n.title,
          content: n.content,
          color: n.color ?? "bg-yellow-200",
          dateLabel,
          timeLabel,
          role: n.role, // sudah dihitung server
          isPublic: n.isPublic,
          publicSlug: n.publicSlug,
          initialShareMode: n.initialShareMode,
          initialTeam: n.initialTeam,
          slug: n.slug,
          commentsCount: n.commentsCount ?? 0,
          collaborators: (n.collaborators || []).map((c: any) => ({
            role: c.role,
            user: { id: c.user.id, email: c.user.email, name: c.user.name },
          })),
        } as NoteItem;
      });

      setNotes((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const dedup = mapped.filter((m) => !seen.has(m.id));
        return [...prev, ...dedup];
      });
      setNextCursor(json.nextCursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  // IntersectionObserver – tanpa menjadikan sentinelRef.current sebagai dep
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main>
          <section className="relative px-4 sm:px-5 xl:max-w-7xl mx-auto py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* New Note – optimistic add */}
              <Card className="p-4 border-2 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center text-center">
                <NoteDialog
                  trigger={
                    <Button className="w-8 h-8 bg-gray-800 rounded-lg mb-2 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-white" />
                    </Button>
                  }
                  onCreated={(created) => {
                    setNotes((prev) => [created, ...prev]);
                    router.refresh();
                  }}
                />
                <span className="text-sm font-medium">New Note</span>
              </Card>

              {notes.map((n) => {
                const canEdit = n.role === "owner" || n.role === "editor";
                const canDelete = n.role === "owner";
                return (
                  <NoteCard
                    key={n.id}
                    noteId={n.id}
                    colorClass={n.color}
                    dateLabel={n.dateLabel}
                    timeLabel={n.timeLabel}
                    title={n.title}
                    commentCount={n.commentsCount}
                    canComment={n.role !== "viewer"}
                    role={n.role}
                    initialShareMode={n.initialShareMode}
                    initialTeam={n.initialTeam}
                    publicSlug={n.publicSlug}
                    content={n.content}
                    onEdit={canEdit ? () => openFor(n.id) : undefined}
                    onDelete={canDelete ? () => onDelete(n.id) : undefined}
                    onShareSubmit={async (id, { mode, teamUserId }) => {
                      await fetch(`/api/notes/${id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          shareMode: mode === "public" ? "public" : "team",
                          teamUserId:
                            mode === "team" ? teamUserId ?? null : null,
                        }),
                      });
                      router.refresh();
                    }}
                  />
                );
              })}
            </div>

            {/* sentinel + indicators */}
            <div ref={sentinelRef} className="h-10" />
            {loadingMore && (
              <div className="py-6 text-center text-sm text-gray-500">
                Loading more…
              </div>
            )}
            {!nextCursor && (
              <div className="py-6 text-center text-xs text-gray-400">— end —</div>
            )}
          </section>
        </main>
      </div>

      {/* Single controlled dialog for View/Edit/Share */}
      {selected && (
        <NoteDialog
          note={{
            id: selected.id,
            title: selected.title,
            content: selected.content,
            color: selected.color,
            isPublic: selected.initialShareMode === "public",
            publicLink: selected.slug ? { slug: selected.slug } : null,
            collaborators: (selected.collaborators || []).map((c) => ({
              userId: c.user.id,
              email: c.user.email,
              name: c.user.name,
            })),
          }}
          role={selected.role}
          openOverride={dialogOpen}
          onOpenChange={(o) => {
            if (!o) {
              setDialogOpen(false);
              setSelectedId(null);
            }
          }}
          readOnly={selected.role === "viewer"}
        />
      )}
    </div>
  );
}
