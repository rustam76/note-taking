import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import NotesGrid from "@/components/notes-grid";
import { fmtDateStr, fmtTimeStr } from "@/lib/utils";

const PAGE_SIZE = 10;

export default async function Home() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id;
  if (!uid) redirect("/login");

  const rows = await prisma.note.findMany({
    where: {
      OR: [{ ownerId: uid }, { collaborators: { some: { userId: uid } } }],
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
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

  const hasMore = rows.length > PAGE_SIZE;
  const slice = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  const data = slice.map((n) => {
    const myCollab = n.collaborators.find((c) => c.userId === uid);
    const firstOtherCollab = n.collaborators.find((c) => c.userId !== uid);

    const role = (n.ownerId === uid
      ? "owner"
      : (myCollab?.role ?? "viewer")) as "owner" | "editor" | "viewer";

    const initialShareMode =
      (role === "owner"
        ? (n.isPublic ? "public" : firstOtherCollab ? "team" : "private")
        : "team") as "public" | "team" | "private";

    return {
      id: n.id,
      title: n.title,
      content: n.content,
      color: n.color ?? "bg-yellow-200",
      dateLabel: fmtDateStr(n.updatedAt),
      timeLabel: fmtTimeStr(n.updatedAt),

      role,
      isPublic: n.isPublic && role === "owner",
      publicSlug: role === "owner" ? (n.publicLink?.slug ?? null) : null,

      initialShareMode,
      initialTeam: firstOtherCollab
        ? {
            id: firstOtherCollab.user.id,
            email: firstOtherCollab.user.email,
            name: firstOtherCollab.user.name ?? null,
          }
        : null,

      slug: role === "owner" ? (n.publicLink?.slug ?? null) : null,
      commentsCount: n._count.comments,

      collaborators: n.collaborators.map((c) => ({
        role: c.role as "owner" | "editor" | "viewer",
        user: {
          id: c.user.id,
          email: c.user.email,
          name: c.user.name ?? null,
        },
      })),
      // sisipkan cursor internal utk hitung nextCursor:
      _cursor: { updatedAt: n.updatedAt.toISOString(), id: n.id },
    };
  });

  const initialCursor = hasMore
    ? {
        updatedAt: data[data.length - 1]._cursor.updatedAt,
        id: data[data.length - 1]._cursor.id,
      }
    : null;

  const initialNotes = data.map(({ _cursor, ...rest }) => rest);

  return <NotesGrid initialNotes={initialNotes} initialCursor={initialCursor} />;
}
