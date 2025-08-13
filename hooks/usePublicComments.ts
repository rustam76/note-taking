"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchComments, postComment } from "@/service/comments";
import type { Comment } from "@/types";

export function usePublicComments(
  noteId: string,
  { autoLoad = true }: { autoLoad?: boolean } = {}
) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [loadingList, setLoadingList] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = 0;
    });
  };

  const load = useCallback(async () => {
    setErr(null);
    const ctrl = new AbortController();
    setLoadingList(true);
    try {
      const data = await fetchComments(noteId, ctrl.signal);
      setComments(data);
      scrollToTop();
    } catch (e: any) {
      if (e.name !== "AbortError") setErr(e.message || "Failed to load comments");
    } finally {
      setLoadingList(false);
    }
    return () => ctrl.abort();
  }, [noteId]);

  const add = useCallback(
    async (body: string) => {
      if (!body.trim()) return;
      setLoading(true);
      setErr(null);
      try {
        const saved = await postComment(noteId, body);
        setComments((prev) => [saved, ...prev]); // prepend terbaru
        scrollToTop();
        return saved;
      } catch (e: any) {
        setErr(e.message || "Failed to add comment");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [noteId]
  );

  // auto load saat mount / noteId berubah
  useEffect(() => {
    if (!autoLoad) return;
    let cleanup: (() => void) | undefined;
    load().then((abortFn) => {
      cleanup = abortFn;
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, [load, autoLoad]);

  return { comments, err, loading, loadingList, load, add, listRef };
}
