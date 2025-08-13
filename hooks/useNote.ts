"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ShareChoice, UserOption } from "@/types";
import {
  deleteNote,
  getNoteShareState,
  searchUsers,
  updateNoteShare,
  waitForSlug,
} from "@/service/notes";

type UseNoteArgs = {
  noteId: string;
  onDelete?: () => Promise<void> | void;

  initialShareMode?: "private" | "team" | "public";
  initialTeam?: { id: string; email: string; name?: string | null } | null;
  publicSlug?: string | null;
  onShareSubmit?: (
    noteId: string,
    payload: { mode: ShareChoice; teamUserId?: string | null }
  ) => Promise<{ slug?: string } | void>;
};

export function useNote({
  noteId,
  onDelete,
  initialShareMode = "private",
  initialTeam = null,
  publicSlug = null,
  onShareSubmit,
}: UseNoteArgs) {
  // ===== Delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = useCallback(async () => {
    try {
      setDeleting(true);
      if (onDelete) await onDelete();
      else await deleteNote(noteId);
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }, [noteId, onDelete]);

  // ===== Share
  const [shareMode, setShareMode] = useState<ShareChoice>(
    initialShareMode === "team" ? "team" :
    initialShareMode === "public" ? "public" : "private"
  );
  const [shareOpen, setShareOpen] = useState(false);

  // Team picker
  const [teamQuery, setTeamQuery] = useState("");
  const [teamOptions, setTeamOptions] = useState<UserOption[]>([]);
  const [teamUserId, setTeamUserId] = useState<string | undefined>(initialTeam?.id ?? undefined);
  const [teamPopoverOpen, setTeamPopoverOpen] = useState(false);

  // Public link
  const [slug, setSlug] = useState<string | null>(publicSlug);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = useMemo(() => (slug ? `${origin}/p/${slug}` : ""), [slug, origin]);

  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  // ✅ helper: pastikan user terpilih ada di daftar untuk label
  const upsertTeamOption = useCallback((u: UserOption) => {
    setTeamOptions(prev => {
      const map = new Map(prev.map(x => [x.id, x]));
      map.set(u.id, u);
      return Array.from(map.values());
    });
  }, []);

  // Seed ringan saat modal dibuka (tanpa mengubah shareMode)
  useEffect(() => {
    if (!shareOpen) return;
    setShareError(null);
    setShareSuccess(null);
    setTeamUserId(initialTeam?.id ?? undefined);
    setSlug(publicSlug ?? null);

    if (initialTeam) {
      setTeamOptions(prev => {
        const exist = prev.some(u => u.id === initialTeam.id);
        const seed = { id: initialTeam.id, email: initialTeam.email, name: initialTeam.name ?? null };
        return exist ? prev : [seed, ...prev];
      });
    }

    // auto open invite user jika mode Team
    if (shareMode === "team") setTeamPopoverOpen(true);
  }, [shareOpen, initialTeam, publicSlug, shareMode]);

  // Live search Team
  useEffect(() => {
    const q = teamQuery.trim();
    if (q.length < 1) {
      // pertahankan hanya seed jika ada
      setTeamOptions(prev => (prev.length ? prev.slice(0, 1) : []));
      setShareError(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setShareError(null);
        const list = await searchUsers(q, ctrl.signal);
        setTeamOptions(prev => {
          const seed = initialTeam ? [{ id: initialTeam.id, email: initialTeam.email, name: initialTeam.name ?? null }] : [];
          const dedup = new Map<string, UserOption>();
          [...seed, ...list].forEach(u => dedup.set(u.id, u));
          return Array.from(dedup.values());
        });
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setTeamOptions(prev => (prev.length ? prev.slice(0, 1) : []));
        setShareError("Gagal memuat user");
      }
    }, 300);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [teamQuery, initialTeam]);

  const submitShareWith = useCallback(
    async (mode: ShareChoice, overrideTeamId?: string | null) => {
      try {
        setShareSubmitting(true);
        setShareError(null);
        setShareSuccess(null);

        let result: { slug?: string } | void;
        if (onShareSubmit) {
          result = await onShareSubmit(noteId, {
            mode,
            teamUserId: mode === "team" ? overrideTeamId ?? teamUserId ?? null : null,
          });
        } else {
          result = await updateNoteShare(noteId, {
            mode,
            teamUserId: mode === "team" ? overrideTeamId ?? teamUserId ?? null : null,
          });
        }

        if (mode === "public") {
          let newSlug = result?.slug;
          if (!newSlug) {
            newSlug = (await waitForSlug(noteId, { tries: 6, delayMs: 250 })) ?? undefined;
          }
          if (!newSlug) {
            const latest = await getNoteShareState(noteId);
            if (latest?.slug) newSlug = latest.slug;
          }
          setSlug(newSlug ?? null);
          setShareSuccess(newSlug
            ? "Link publik siap dibagikan."
            : "Sudah diubah ke Public, tetapi link belum tersedia. Coba 'Refresh' atau buka lagi."
          );
        } else if (mode === "team") {
          const finalTeamId = overrideTeamId ?? teamUserId ?? undefined;
          if (finalTeamId && !teamOptions.find(o => o.id === finalTeamId)) {
            // fallback label saat belum ada data user lengkap
            setTeamOptions(prev => [{ id: finalTeamId, email: "Selected user", name: null }, ...prev]);
          }
          setShareSuccess("Visibilitas diset ke Team.");
          setTeamPopoverOpen(false);
        } else {
          // private
          setSlug(null);
          setShareSuccess("Visibilitas diset ke Private.");
        }

        setShareMode(mode);
      } catch (e: any) {
        setShareError(e?.message || "Gagal mengubah visibilitas");
        throw e;
      } finally {
        setShareSubmitting(false);
      }
    },
    [noteId, onShareSubmit, teamUserId, teamOptions]
  );

  const submitShare = useCallback(async () => {
    await submitShareWith(shareMode, undefined);
  }, [shareMode, submitShareWith]);

  const copyLink = useCallback(async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setShareSuccess("Link disalin ke clipboard.");
  }, [publicUrl]);

  return {
    // delete
    confirmOpen, setConfirmOpen, deleting, handleConfirmDelete,
    // share
    shareOpen, setShareOpen,
    shareMode, setShareMode,
    teamQuery, setTeamQuery,
    teamOptions, teamUserId, setTeamUserId,
    teamPopoverOpen, setTeamPopoverOpen,
    publicUrl,
    shareSubmitting, shareError, shareSuccess,
    submitShare, submitShareWith,
    copyLink,
    upsertTeamOption, // ⬅️ expose buat dipakai di NoteCard
  };
}
