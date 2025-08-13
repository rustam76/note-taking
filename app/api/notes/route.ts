// app/api/notes/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { nanoid } from "nanoid";

type Body = {
  title: string;
  content: string;
  shareMode?: "private" | "team" | "public";
  teamUserId?: string; // id user yang diundang (opsional)
  color?: string;      // "bg-yellow-200" | "bg-red-200" | etc.
};

// POST /api/notes -> buat note baru
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, content, shareMode = "private", teamUserId, color }: Body = await req.json();

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const note = await prisma.note.create({
    data: {
      ownerId: uid,
      title: title.trim(),
      content: content ?? "",
      color,
      isPublic: shareMode === "public",
      updatedBy: uid,
    },
    select: { id: true },
  });

  if (shareMode === "team" && teamUserId) {
    await prisma.noteCollaborator.upsert({
      where: { noteId_userId: { noteId: note.id, userId: teamUserId } },
      update: { role: "editor" },
      create: { noteId: note.id, userId: teamUserId, role: "editor" },
    });
  }

  let slug: string | undefined;
  if (shareMode === "public") {
    const link = await prisma.notePublicLink.upsert({
      where: { noteId: note.id },
      update: {},
      create: { noteId: note.id, slug: nanoid(10) },
      select: { slug: true },
    });
    slug = link.slug;
  }

  return NextResponse.json({ id: note.id, slug }, { status: 201 });
}

const DEFAULT_LIMIT = 10;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get("limit")) || DEFAULT_LIMIT;
  const cursorParam = searchParams.get("cursor"); // JSON string: {"updatedAt":"...","id":"..."}

  let cursor: { updatedAt: string; id: string } | null = null;
  if (cursorParam) {
    try {
      cursor = JSON.parse(cursorParam);
    } catch {}
  }

  const whereBase = {
    OR: [
      { ownerId: uid },
      { collaborators: { some: { userId: uid } } },
    ],
  };

  const whereWithCursor =
    cursor
      ? {
          AND: [
            whereBase,
            {
              OR: [
                { updatedAt: { lt: new Date(cursor.updatedAt) } },
                {
                  AND: [
                    { updatedAt: { equals: new Date(cursor.updatedAt) } },
                    { id: { lt: cursor.id } },
                  ],
                },
              ],
            },
          ],
        }
      : whereBase;

  const notes = await prisma.note.findMany({
    where: whereWithCursor,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limitParam + 1, // ambil 1 ekstra untuk deteksi next
    select: {
      id: true,
      title: true,
      content: true,
      color: true,
      updatedAt: true,
      ownerId: true,
      isPublic: true,
      publicLink: { select: { slug: true } },
      collaborators: {
        select: {
          userId: true,
          role: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
      _count: { select: { comments: true } },
    },
  });

  const hasMore = notes.length > limitParam;
  const slice = hasMore ? notes.slice(0, limitParam) : notes;

  const items = slice.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    color: n.color ?? "bg-yellow-200",
    updatedAt: n.updatedAt,
    ownerId: n.ownerId,
    isPublic: n.isPublic,
    publicSlug: n.publicLink?.slug ?? null,
    collaborators: n.collaborators,
    commentsCount: n._count.comments,
  }));

  const nextCursor =
    hasMore
      ? {
          updatedAt: slice[slice.length - 1].updatedAt.toISOString(),
          id: slice[slice.length - 1].id,
        }
      : null;

  return NextResponse.json({ items, nextCursor });
}