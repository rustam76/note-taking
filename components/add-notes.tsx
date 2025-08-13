"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Copy } from "lucide-react";

import {
  useNoteDialog,
  type NoteMinimal,
  type Role,
  type ShareMode,
} from "@/hooks/useNoteDialog";

// >>> tambahkan import tipe NoteItem untuk onCreated
import type { NoteItem } from "@/types";

const noteColors = [
  { value: "bg-yellow-200", label: "Yellow" },
  { value: "bg-red-200", label: "Red" },
  { value: "bg-blue-200", label: "Blue" },
  { value: "bg-green-200", label: "Green" },
];

export function NoteDialog({
  trigger,
  note,
  openOverride,
  onOpenChange,
  readOnly = false,
  role,
  // >>> prop baru
  onCreated,
}: {
  trigger?: React.ReactNode;
  note?: NoteMinimal;
  openOverride?: boolean;
  onOpenChange?: (open: boolean) => void;
  readOnly?: boolean;
  role?: Role;
  onCreated?: (note: NoteItem) => void; // <<< baru
}) {
  const router = useRouter();

  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = openOverride ?? internalOpen;
  const setOpen = (v: boolean) => { onOpenChange?.(v); setInternalOpen(v); };

  const {
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
    copyUrl, copyPublicLink,

    // save
    saving, save, saveError,
  } = useNoteDialog({ note, role, readOnly });

  // auto-buka Popover saat pilih Team; tutup saat keluar dari Team
  React.useEffect(() => {
    if (!canManageVisibility) return;
    setOpenTeam(shareMode === "team");
  }, [shareMode, canManageVisibility, setOpenTeam]);

  async function onSave() {
    const close = () => setOpen(false);

    // Jalankan save (create/update). Save akan mengembalikan info aksi & data.
    const result = await save(() => {
      // kalau Public → dialog copy link dibuka; biarkan dialog utama tetap.
    });

    // >>> Jika create sukses: lakukan optimistic add via onCreated
    if (result?.action === "create") {
      const { id, updatedAt, slug } = result.data;

      const date = updatedAt ? new Date(updatedAt) : new Date();
      const dateLabel = date.toLocaleDateString();
      const timeLabel = date.toLocaleTimeString();

      const team = teamUserId
        ? (() => {
            const u = teamOptions.find((x) => x.id === teamUserId);
            return u ? { id: u.id, email: u.email, name: u.name } : null;
          })()
        : null;

      const mapped: NoteItem = {
        id,
        title: title || "",
        content: content || "",
        color: color || "bg-yellow-200",
        dateLabel,
        timeLabel,
        role: "owner",
        isPublic: canManageVisibility && shareMode === "public",
        publicSlug: canManageVisibility && shareMode === "public" ? (slug ?? null) : null,
        initialShareMode: (shareMode as "public" | "team" | "private"),
        initialTeam: shareMode === "team" ? team : null,
        slug: canManageVisibility && shareMode === "public" ? (slug ?? null) : null,
        commentsCount: 0,
        collaborators: [], // opsional: bisa isi seed collaborator jika perlu
      };

      onCreated?.(mapped);
    }

    // Tutup dialog jika bukan mode public (mode public butuh copy link dulu)
    if (!(canManageVisibility && shareMode === "public")) {
      close();
      router.refresh(); // samakan state server (count/cursor) di background
    }
  }

  const mustPickTeamUser = canManageVisibility && shareMode === "team" && !teamUserId;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{note ? (readOnly ? "View Note" : "Edit Note") : "New Note"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={readOnly}
            />

            <Textarea
              placeholder="Write your note..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={readOnly}
            />

            {/* Visibility — create atau owner */}
            {canManageVisibility && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Visibility</label>
                  <Select
                    value={shareMode}
                    onValueChange={(v) => setShareMode(v as ShareMode)}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Bagikan ke" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {shareMode === "team" && (
                  <div className="space-y-2 grid gap-2">
                    <label className="text-sm font-medium">Invite user (email/nama)</label>
                    <Popover open={openTeam} onOpenChange={setOpenTeam}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openTeam}
                          className="w-full justify-between"
                          disabled={readOnly}
                        >
                          {teamUserId
                            ? (teamOptions.find(u => u.id === teamUserId)?.email ?? "Selected user")
                            : "Type to search user..."}
                          <ChevronsUpDown className="opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search by email or name..."
                            value={teamQuery}
                            onValueChange={setTeamQuery}
                            className="h-9"
                            autoFocus
                          />
                          <CommandList>
                            <CommandEmpty>{searchLoading ? "Loading..." : "No result."}</CommandEmpty>
                            <CommandGroup>
                              {teamOptions.map((u) => (
                                <CommandItem
                                  key={u.id}
                                  value={u.email}
                                  onSelect={() => { setTeamUserId(u.id); setOpenTeam(false); }}
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

                    {mustPickTeamUser && (
                      <p className="text-xs text-amber-600">Pilih minimal satu user untuk mode Team.</p>
                    )}

                    {err && <p className="text-xs text-red-600">{err}</p>}
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Note color</label>
              <div className="flex flex-wrap gap-2">
                {noteColors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "h-9 rounded-md px-3 text-sm border transition",
                      c.value,
                      color === c.value ? "ring-2 ring-black/60 border-black/40" : "border-black/10"
                    )}
                    title={c.label}
                    disabled={readOnly}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            {!readOnly && (
              <Button
                onClick={onSave}
                disabled={saving || !title.trim() || (canManageVisibility && shareMode === "team" && !teamUserId)}
              >
                {saving ? "Saving..." : note ? "Save changes" : "Create"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Public link created 🎉</DialogTitle>
          </DialogHeader>

        <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Bagikan tautan ini untuk mengakses catatan secara publik.</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={copyUrl || "Generating link..."} />
              <Button variant="outline" onClick={async () => { await copyPublicLink(); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => { setCopyOpen(false); setOpen(false); router.refresh(); }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
