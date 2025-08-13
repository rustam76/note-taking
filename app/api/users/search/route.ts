
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const take = Math.min(50, Number(searchParams.get("limit") || 10));
  if (!q) return NextResponse.json([]);


    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name:  { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, image: true },
      take,
      orderBy: [{ name: "asc" }],
    });

     return NextResponse.json(users);
}
