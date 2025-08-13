"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Clock, EllipsisVertical, MessageCircleMore, Pen, Share2, Trash2,
  Check, ChevronsUpDown, Copy,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AddComment } from "./add-comment";

import { useNote } from "@/hooks/useNote";
import type { Role, ShareChoice, NoteCardProps } from "@/types";

export function NoteCard(props: NoteCardProps) {
  const {
    noteId, title, content, dateLabel, timeLabel,
    colorClass = "bg-white", className, role = "viewer",
    onEdit, onDelete, onShareSubmit,
    initialShareMode = "private", initialTeam = null, publicSlug = null,
    commentCount = 0, canComment = false,
  } = props;

  const [count, setCount] = useState(commentCount);

  const showMenu =
    role === "owner" ? !!(onEdit || onDelete || onShareSubmit)
    : role === "editor" ? !!onEdit
    : false;

  const {
    // delete
    confirmOpen, setConfirmOpen, deleting, handleConfirmDelete,
    // share
    shareOpen, setShareOpen, shareMode, setShareMode,
    teamQuery, setTeamQuery, teamOptions, teamUserId, setTeamUserId,
    teamPopoverOpen, setTeamPopoverOpen, publicUrl,
    shareSubmitting, shareError, shareSuccess,
    submitShare, submitShareWith, copyLink,
    upsertTeamOption, // ⬅️ penting untuk perbaikan label & state
  } = useNote({
    noteId,
    onDelete,
    initialShareMode,
    initialTeam,
    publicSlug,
    onShareSubmit,
  });

  return (
    <>
      <Card className={cn("p-4 border-0 relative group transition-all duration-200 hover:shadow-lg", colorClass, className)}>
        {/* Menu */}
        {showMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="absolute top-3 right-3 w-6 h-6 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                aria-label="Open menu"
              >
                <EllipsisVertical className="w-4 h-4 text-black" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white shadow-md px-4 py-2 rounded-2xl">
              {onEdit && (
                <>
                  <DropdownMenuLabel className="flex items-center gap-2 cursor-pointer" onClick={onEdit}>
                    <Pen className="w-4 h-4 text-black" /> Edit
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}

              {role === "owner" && (
                <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={() => setShareOpen(true)}>
                  <Share2 className="w-4 h-4 text-black" /> Share
                </DropdownMenuItem>
              )}

              {onDelete && (onEdit || role === "owner") && <DropdownMenuSeparator />}

              {onDelete && (
                <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-red-600" onClick={() => setConfirmOpen(true)}>
                  <Trash2 className="w-4 h-4" /> Hapus
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Content */}
        <div className="text-xs text-gray-500 mb-2">{dateLabel}</div>
        <h3 className="font-semibold text-sm mb-2 line-clamp-1 group-hover:line-clamp-none transition-all">{title}</h3>
        <p className="text-xs text-gray-700 mb-4 line-clamp-3 group-hover:line-clamp-none transition-all">{content}</p>

        {/* Footer */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{timeLabel}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <AddComment
              noteId={noteId}
              canComment={canComment}
              trigger={<MessageCircleMore className="w-5 h-5 cursor-pointer" />}
              onAdded={() => setCount((c) => c + 1)}
            />
            {count > 0 && <span>{count}</span>}
          </div>
        </div>
      </Card>

      {/* Confirm Delete */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus catatan?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tindakan ini tidak dapat dibatalkan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Bagikan catatan</DialogTitle></DialogHeader>

          <div className="space-y-4">
            {shareSuccess && (
              <div className="text-xs rounded-md border border-green-200 bg-green-50 px-3 py-2 text-green-700">
                {shareSuccess}
              </div>
            )}
            {shareError && (
              <div className="text-xs rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                {shareError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Visibility</label>
              <Select
                value={shareMode}
                onValueChange={async (v) => {
                  const mode = v as ShareChoice;
                  if (mode === "private") {
                    try {
                      await submitShareWith("private", null);
                      setShareOpen(false); // langsung close jika pilih private
                    } catch {/* ignore */}
                  } else {
                    setShareMode(mode);
                    if (mode === "team") setTeamPopoverOpen(true); // auto-open invite user
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Pilih visibilitas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {shareMode === "team" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Pilih user (email/nama)</label>
                <Popover open={teamPopoverOpen} onOpenChange={setTeamPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={teamPopoverOpen} className="w-full justify-between">
                      {teamUserId
                        ? (teamOptions.find((u) => u.id === teamUserId)?.email
                          ?? props.initialTeam?.email
                          ?? "User terpilih")
                        : (props.initialTeam?.email ?? "Ketik untuk mencari...")}
                      <ChevronsUpDown className="opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px] p-0">
                    <Command>
                      <CommandInput placeholder="Cari user…" value={teamQuery} onValueChange={setTeamQuery} className="h-9" />
                      <CommandList>
                        <CommandEmpty>Tidak ada hasil.</CommandEmpty>
                        <CommandGroup>
                          {teamOptions.map((u) => (
                            <CommandItem
                              key={u.id}
                              value={u.email}
                              onSelect={() => {
                                setTeamUserId(u.id);
                                upsertTeamOption(u); // ⬅️ pastikan ada di options agar label update
                                setTeamPopoverOpen(false);
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm">{u.email}</span>
                                {u.name && <span className="text-xs text-muted-foreground">{u.name}</span>}
                              </div>
                              <Check className={cn("ml-auto", teamUserId === u.id ? "opacity-100" : "opacity-0")} />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {shareMode === "public" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Public link</label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={publicUrl || "Link akan dibuat setelah Simpan"} />
                  <Button variant="outline" onClick={copyLink} disabled={!publicUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {!publicUrl && (
                  <p className="text-xs text-muted-foreground">
                    Simpan sebagai <b>Public</b> untuk membuat tautan publik.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>Tutup</Button>
            <Button
              onClick={submitShare}
              disabled={shareSubmitting || (shareMode === "team" && !teamUserId && !props.initialTeam?.id)}
            >
              {shareSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
