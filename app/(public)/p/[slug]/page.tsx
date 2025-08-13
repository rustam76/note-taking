// app/(public)/p/[slug]/page.tsx
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import PublicComments from "@/components/public-comments";

export const revalidate = 60; // ISR ringan

export default async function PublicNotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const link = await prisma.notePublicLink.findUnique({
    where: { slug },
    include: { note: true },
  });

  if (!link || !link.note || !link.note.isPublic) {
    notFound();
  }

  const note = link.note;

  return (
    <main className={`min-h-screen ${note.color ?? "bg-yellow-200"}`}>
      <div className="max-w-2xl mx-auto p-6">
        <article className="bg-white/90 backdrop-blur rounded-xl shadow p-5">
          <header className="mb-4">
            <h1 className="text-2xl font-bold">{note.title}</h1>
            <p className="text-xs text-gray-500">
              Updated {note.updatedAt.toLocaleString()}
            </p>
          </header>

          <div className="prose whitespace-pre-wrap">
            {note.content}
          </div>
        </article>

        <section className="mt-6">
          <PublicComments noteId={note.id} />
        </section>
      </div>
    </main>
  );
}
