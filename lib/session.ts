// lib/session.ts
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id as string | undefined;
}
