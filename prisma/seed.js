import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Bersihkan data lama (urutan aman terhadap FK)
  await prisma.comment.deleteMany();
  await prisma.notePublicLink.deleteMany();
  await prisma.noteCollaborator.deleteMany();
  await prisma.note.deleteMany();
  await prisma.user.deleteMany();

  // Password sama untuk semua user demo
  const passwordHash = await bcrypt.hash("password123", 10);

  // User utama (Abdul)
  const user = await prisma.user.create({
    data: {
      email: "abdul@gmail.com",
      name: "Abdul",
      passwordHash,
      image: null,
    },
  });

  // Buat 5 user lain
  const [siti, budi, clara, dimas, eka] = await Promise.all([
    prisma.user.create({
      data: { email: "siti@gmail.com", name: "Siti", passwordHash, image: null },
    }),
    prisma.user.create({
      data: { email: "budi@gmail.com", name: "Budi", passwordHash, image: null },
    }),
    prisma.user.create({
      data: { email: "clara@gmail.com", name: "Clara", passwordHash, image: null },
    }),
    prisma.user.create({
      data: { email: "dimas@gmail.com", name: "Dimas", passwordHash, image: null },
    }),
    prisma.user.create({
      data: { email: "eka@gmail.com", name: "Eka", passwordHash, image: null },
    }),
  ]);

  // Catatan Abdul
  const privateNote = await prisma.note.create({
    data: {
      ownerId: user.id,
      title: "Catatan Pribadi",
      content: "Ini adalah catatan pribadi.",
      isPublic: false,
      color: "bg-yellow-200",
    },
  });

  const publicNote = await prisma.note.create({
    data: {
      ownerId: user.id,
      title: "Catatan Publik",
      content: "Ini catatan yang bisa diakses semua orang.",
      isPublic: true,
      color: "bg-blue-200",
    },
  });

  await prisma.notePublicLink.create({
    data: {
      noteId: publicNote.id,
      slug: "catatan-publik-demo",
    },
  });

  // Komentar awal (tetap)
  await prisma.comment.create({
    data: {
      noteId: publicNote.id,
      authorId: user.id,
      body: "Komentar pertama di catatan publik.",
    },
  });

  // Tambah komentar lain dari 5 user baru ke publicNote
  await prisma.comment.createMany({
    data: [
      {
        noteId: publicNote.id,
        authorId: siti.id,
        body: "Mantap! Catatannya jelas dan singkat.",
      },
      {
        noteId: publicNote.id,
        authorId: budi.id,
        body: "Bisa ditambah poin ringkasan di akhir?",
      },
      {
        noteId: publicNote.id,
        authorId: clara.id,
        body: "Aku suka bagian tipsnya, cukup membantu.",
      },
      {
        noteId: publicNote.id,
        authorId: dimas.id,
        body: "Keren. Ada rencana bikin versi PDF?",
      },
      {
        noteId: publicNote.id,
        authorId: eka.id,
        body: "Terima kasih sudah share!",
      },
    ],
  });

  // (Opsional) komentar di privateNote oleh owner (supaya ada aktivitas)
  await prisma.comment.create({
    data: {
      noteId: privateNote.id,
      authorId: user.id,
      body: "Catatan pribadi – draft awal.",
    },
  });

  console.log("✅ Seed data berhasil dibuat (5 user + komentar tambahan).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
