export const runtime = "nodejs";

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { nanoid } from "nanoid";

type Body = {
  title?: string;
  content?: string;
  color?: string | null;
  shareMode?: "private" | "team" | "public";
  teamUserId?: string | null;
};

async function canEdit(noteId: string, uid: string) {
  const x = await prisma.note.findFirst({
    where: {
      id: noteId,
      OR: [
        { ownerId: uid },
        { collaborators: { some: { userId: uid, role: "editor" } } },
      ],
    },
    select: { id: true },
  });
  return !!x;
}

async function canView(noteId: string, uid?: string | null) {
  const x = await prisma.note.findFirst({
    where: {
      id: noteId,
      OR: [
        { isPublic: true },
        ...(uid
          ? [
              { ownerId: uid },
              { collaborators: { some: { userId: uid } } },
            ]
          : []),
      ],
    },
    select: { id: true },
  });
  return !!x;
}

/**
 * GET /api/notes/[id]
 * Mengembalikan minimal field yang dibutuhkan UI:
 * { isPublic, publicLink: { slug }, collaborators: [{ user: { id, email, name } }] }
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id ?? null;

  const allowed = await canView(id, uid);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const note = await prisma.note.findUnique({
    where: { id },
    select: {
      id: true,
      isPublic: true,
      publicLink: { select: { slug: true } },
      collaborators: {
        select: {
          user: { select: { id: true, email: true, name: true } },
          role: true,
        },
        take: 1, // cukup satu untuk deteksi "team"
      },
    },
  });

  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(note, { status: 200 });
}

/**
 * PUT /api/notes/[id]
 * - Update field dasar (title/content/color)
 * - Atur shareMode: "private" | "public" | "team"
 *   - "private": isPublic=false, hapus publicLink & collaborators
 *   - "public": isPublic=true, upsert publicLink + return { slug }
 *   - "team": isPublic=false, hapus publicLink, set collaborator editor (teamUserId)
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canEdit(id, uid))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, content, color, shareMode, teamUserId }: Body = await req.json();
  await prisma.note.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(color !== undefined ? { color: color ?? null } : {}),
      ...(shareMode ? { isPublic: shareMode === "public" } : {}),
      updatedBy: uid,
    },
  });

  let slug: string | undefined;

  if (shareMode === "private") {
    // Interactive transaction => tidak ada array typing issue
    await prisma.$transaction(async (tx) => {
      await tx.notePublicLink.deleteMany({ where: { noteId: id } });
      await tx.noteCollaborator.deleteMany({ where: { noteId: id } });
      await tx.note.update({ where: { id }, data: { isPublic: false } });
    });
  }

  if (shareMode === "public") {
    slug = nanoid(10);
    await prisma.$transaction(async (tx) => {
      await tx.noteCollaborator.deleteMany({ where: { noteId: id } });
      await tx.note.update({ where: { id }, data: { isPublic: true } });
      await tx.notePublicLink.upsert({
        where: { noteId: id },
        update: { slug },
        create: { noteId: id, slug: slug as string },
      });
    });
    return NextResponse.json({ ok: true, slug }, { status: 200 });
  }

  if (shareMode === "team") {
    await prisma.$transaction(async (tx) => {
      await tx.notePublicLink.deleteMany({ where: { noteId: id } });
      await tx.noteCollaborator.deleteMany({ where: { noteId: id } });
      await tx.note.update({ where: { id }, data: { isPublic: false } });
      if (teamUserId) {
        await tx.noteCollaborator.upsert({
          where: { noteId_userId: { noteId: id, userId: teamUserId } },
          update: { role: "editor" },
          create: { noteId: id, userId: teamUserId, role: "editor" },
        });
      }
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}


export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const own = await prisma.note.findFirst({
    where: { id, ownerId: uid },
    select: { id: true },
  });
  if (!own) return NextResponse.json({ error: "Only owner can delete" }, { status: 403 });

  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
