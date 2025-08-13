export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const Body = z.object({ body: z.string().min(1) });

async function getNoteAccess(noteId: string, userId?: string) {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: {
      id: true,
      isPublic: true,
      ownerId: true,
      collaborators: userId
        ? { where: { userId }, select: { userId: true } }
        : false,
    },
  });
  return note;
}

// GET: list komentar
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // cek note & mode
  const note = await prisma.note.findUnique({
    where: { id },
    select: { id: true, isPublic: true },
  });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // public: semua boleh lihat; private/team: harus authorized
  if (!note.isPublic) {
    const session = await getServerSession(authOptions);
    const uid = (session?.user as any)?.id;
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await prisma.note.findFirst({
      where: { id, OR: [{ ownerId: uid }, { collaborators: { some: { userId: uid } } }] },
      select: { id: true },
    });
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.comment.findMany({
    where: { noteId: id },
    orderBy: { createdAt: "desc" }, // terbaru di atas
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(
    rows.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      authorName: c.author.name ?? c.author.email,
    }))
  );
}

// POST: tambah komentar
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const note = await getNoteAccess(id, uid);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // public: cukup login; private/team: harus owner/kolaborator
  if (!note.isPublic) {
    const member = note.ownerId === uid || (note.collaborators as any[])?.length > 0;
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const c = await prisma.comment.create({
    data: { noteId: id, authorId: uid, body: parsed.data.body },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(
    {
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      authorName: c.author.name ?? c.author.email,
    },
    { status: 201 }
  );
}
