"use client";

import * as React from "react";
import { createNote, updateNote } from "@/service/notes";
import { searchUsers } from "@/service/users";

export type ShareMode = "private" | "team" | "public";
export type Role = "owner" | "editor" | "viewer";

export type NoteMinimal = {
  id: string;
  title: string;
  content: string;
  color?: string | null;
  isPublic?: boolean;
  publicLink?: { slug: string } | null;
  collaborators?: Array<{ userId: string; email: string; name?: string | null }>;
};

export type UserOption = { id: string; email: string; name: string | null };

type Args = {
  note?: NoteMinimal;
  role?: Role;
  readOnly?: boolean;
};

export function useNoteDialog({ note, role, readOnly = false }: Args) {
  const canManageVisibility = !note || role === "owner";

  // form
  const [title, setTitle] = React.useState(note?.title ?? "");
  const [content, setContent] = React.useState(note?.content ?? "");
  const [color, setColor] = React.useState<string>(note?.color ?? "bg-yellow-200");

  // visibility
  const computeInitialShare = React.useCallback((n?: NoteMinimal): ShareMode => {
    if (!n) return "private";
    if (n.isPublic) return "public";
    if (n.collaborators && n.collaborators.length > 0) return "team";
    return "private";
  }, []);

  const [shareMode, setShareMode] = React.useState<ShareMode>(computeInitialShare(note));

  // team search
  const [openTeam, setOpenTeam] = React.useState(false);
  const [teamQuery, setTeamQuery] = React.useState("");
  const [teamOptions, setTeamOptions] = React.useState<UserOption[]>([]);
  const [teamUserId, setTeamUserId] = React.useState<string | undefined>(undefined);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    setColor(note?.color ?? "bg-yellow-200");
    setShareMode(computeInitialShare(note));
    setCreatedSlug(note?.publicLink?.slug);

    const first = note?.collaborators?.[0];
    if (first?.userId) {
      setTeamUserId(first.userId);
      setTeamOptions(prev => {
        const exists = prev.some(u => u.id === first.userId);
        return exists ? prev : [{ id: first.userId, email: first.email, name: first.name ?? null }, ...prev];
      });
    } else {
      setTeamUserId(undefined);
    }
  }, [note, computeInitialShare]);

  React.useEffect(() => {
    if (shareMode !== "team" || teamUserId) return;
    const first = note?.collaborators?.[0];
    if (first?.userId) {
      setTeamUserId(first.userId);
      setTeamOptions(prev => {
        const exists = prev.some(u => u.id === first.userId);
        return exists ? prev : [{ id: first.userId, email: first.email, name: first.name ?? null }, ...prev];
      });
    }
  }, [shareMode, teamUserId, note]);

  // live search
  React.useEffect(() => {
    const q = teamQuery.trim();
    if (!q) {
      setTeamOptions(prev => {
        const seed = note?.collaborators?.[0];
        if (!seed) return [];
        const exists = prev.some(u => u.id === seed.userId);
        return exists ? prev : [{ id: seed.userId, email: seed.email, name: seed.name ?? null }, ...prev];
      });
      setErr(null);
      return;
    }

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setErr(null);
        const list = await searchUsers(q, { limit: 10, signal: ctrl.signal });
        if (!ctrl.signal.aborted) {
          const seed = note?.collaborators?.[0];
          const dedup = new Map<string, UserOption>();
          if (seed) dedup.set(seed.userId, { id: seed.userId, email: seed.email, name: seed.name ?? null });
          list.forEach((u: UserOption) => dedup.set(u.id, u));
          setTeamOptions(Array.from(dedup.values()));
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setTeamOptions(prev => {
          const seed = note?.collaborators?.[0];
          return seed ? [{ id: seed.userId, email: seed.email, name: seed.name ?? null }] : [];
        });
        setErr(e?.message || "Gagal mencari user");
      } finally {
        if (!ctrl.signal.aborted) setSearchLoading(false);
      }
    }, 300);

    return () => { ctrl.abort(); clearTimeout(t); };
  }, [teamQuery, note]);

  // public link
  const [copyOpen, setCopyOpen] = React.useState(false);
  const [createdSlug, setCreatedSlug] = React.useState<string | undefined>(note?.publicLink?.slug);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const copyUrl = createdSlug ? `${origin}/p/${createdSlug}` : "";

  async function copyPublicLink() {
    if (!copyUrl) return;
    await navigator.clipboard.writeText(copyUrl);
  }

  // save
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  /**
   * Mengembalikan:
   * - { action: "create", data: { id, updatedAt, slug } }
   * - { action: "update", data: { slug? } }
   */
  async function save(onAfterPublic?: () => void): Promise<
    | { action: "create"; data: { id: string; updatedAt?: string; slug?: string } }
    | { action: "update"; data: { slug?: string } }
    | undefined
  > {
    if (readOnly) return;
    setSaving(true);
    setSaveError(null);

    try {
      if (!note) {
        // CREATE
        // Pastikan service createNote minimal mengembalikan { id, updatedAt?, slug? }
        const res = await createNote(
          {
            title,
            content,
            color,
            shareMode,
            teamUserId: shareMode === "team" ? teamUserId ?? null : undefined,
          },
          { awaitSlug: true }
        );

        const id: string = res?.id;
        const updatedAt: string = new Date().toISOString();
        const slug: string | undefined = res?.slug;

        if (canManageVisibility && shareMode === "public") {
          setCreatedSlug(slug);
          setCopyOpen(true);
          onAfterPublic?.();
        }

        return { action: "create", data: { id, updatedAt, slug } };
      }

      // UPDATE
      const payload: any = { title, content, color };
      if (canManageVisibility) {
        payload.shareMode = shareMode;
        payload.teamUserId = shareMode === "team" ? teamUserId ?? null : null;
      }
      const res = await updateNote(note.id, payload, { awaitSlug: true });
      const slug: string | undefined = res?.slug;

      if (canManageVisibility && shareMode === "public") {
        setCreatedSlug(slug ?? note.publicLink?.slug);
        setCopyOpen(true);
        onAfterPublic?.();
      }

      return { action: "update", data: { slug } };
    } catch (e: any) {
      setSaveError(e?.message || "Failed to save note");
      throw e;
    } finally {
      setSaving(false);
    }
  }

  return {
    // permission
    canManageVisibility,

    // form
    title, setTitle,
    content, setContent,
    color, setColor,

    // visibility
    shareMode, setShareMode,

    // team search
    openTeam, setOpenTeam,
    teamQuery, setTeamQuery,
    teamOptions, teamUserId, setTeamUserId,
    searchLoading, err,

    // public link
    copyOpen, setCopyOpen,
    createdSlug, copyUrl, copyPublicLink,

    // save
    saving, save, saveError,
  };
}
