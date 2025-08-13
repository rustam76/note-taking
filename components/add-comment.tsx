"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";
import { CommentItem } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { usePublicComments } from "@/hooks/usePublicComments";

export function AddComment({
  trigger,
  noteId,
  onAdded,
  canComment,
}: {
  trigger: React.ReactNode;
  noteId: string;
  onAdded?: (comment: CommentItem) => void;
  canComment: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const {
    comments,
    err,
    
    loading,        
    loadingList,    
    add,
    load,
    listRef,
  } = usePublicComments(noteId);

  async function addComment() {
    const body = text.trim();
    if (!body) return;
    try {
      const saved = await add(body);
      if (saved) onAdded?.(saved as any); 
      setText("");
    } catch (e: any) {
      throw new Error("Internal Server Error");
      
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!loading && text.trim()) addComment();
    }
  }

  const count = comments.length;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) load();
      }}
    >
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="flex flex-col p-0">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b">
          <SheetHeader className="text-left">
            <SheetTitle>Comments {count > 0 ? `(${count})` : ""}</SheetTitle>
            <SheetDescription>
              Lihat dan tambahkan komentar untuk catatan ini.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Composer */}
        {canComment && (
          <div
            className={cn(
              "sticky top-0 z-10 border-b px-5 py-3",
              "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            )}
          >
            <div className="grid gap-2">
              <Label htmlFor="add-comment" className="text-sm font-medium">
                Add a comment
              </Label>
              <Textarea
                id="add-comment"
                placeholder="Tulis komentar… (Ctrl/⌘ + Enter untuk kirim)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                rows={3}
                disabled={loading}
              />
              {err && (
                <p className="text-sm text-red-600" role="alert" aria-live="polite">
                  {err}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <SheetClose asChild>
                  <Button variant="outline">Close</Button>
                </SheetClose>
                <Button onClick={addComment} disabled={loading || !text.trim()}>
                  {loading ? "Saving..." : "Add Comment"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 px-5">
          <div ref={listRef} className="h-[calc(100dvh-240px)] overflow-auto">
            <div className="py-4 grid gap-3">
              {/* Skeleton saat initial load */}
              {loadingList && comments.length === 0 && (
                <>
                  <div className="h-20 rounded-md border animate-pulse bg-muted/50" />
                  <div className="h-20 rounded-md border animate-pulse bg-muted/50" />
                  <div className="h-20 rounded-md border animate-pulse bg-muted/50" />
                </>
              )}

              {!loadingList && comments.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Belum ada komentar.
                </p>
              )}

              {comments.map((c, i) => {
                const self = (c.authorName || "").toLowerCase() === "you";
                const initials = (c.authorName || "U")
                  .split(/\s+/)
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const showName =
                  i === 0 || comments[i - 1].authorName !== c.authorName;

                return (
                  <div
                    key={c.id}
                    className={cn(
                      "flex items-end gap-2",
                      self ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full bg-gray-200 grid place-items-center text-[10px] font-medium text-gray-700 shrink-0",
                        self ? "order-2" : "order-1"
                      )}
                      title={c.authorName}
                    >
                      {initials}
                    </div>

                    {/* Bubble */}
                    <div
                      className={cn(
                        "max-w-[80%] flex flex-col",
                        self ? "order-1 items-end text-right" : "order-2 items-start"
                      )}
                    >
                      {showName && (
                        <div className="text-[11px] text-muted-foreground mb-0.5">
                          {c.authorName}
                        </div>
                      )}

                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 shadow-sm whitespace-pre-wrap",
                          self
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-white border rounded-tl-sm"
                        )}
                      >
                        <p className="text-sm">{c.body}</p>
                      </div>

                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {formatDateTime(c.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <SheetFooter className="px-5 pb-5" />
      </SheetContent>
    </Sheet>
  );
}
