"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [showMobileMenu] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: session, status } = useSession();
  const displayName =
    (session?.user?.name && session.user.name.trim()) ||
    session?.user?.email ||
    "User";

  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleSignOut() {
    // redirect ke /login setelah logout
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <>
      <nav
        className="sticky top-0 z-50 flex flex-col items-center justify-center px-3 pt-px"
        aria-label="Main Navigation"
      >
        <div
          className={[
            "mx-auto flex w-full max-w-5xl items-center justify-between gap-5 rounded-2xl px-5 py-3 xl:max-w-7xl",
            "transition-all duration-200 ease-out ring-1",
            scrolled || showMobileMenu
              ? "translate-y-3 bg-white/60 backdrop-blur-2xl ring-gray-200/80 dark:bg-black/50 dark:ring-gray-700/70"
              : "ring-transparent",
          ].join(" ")}
        >
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold transition-opacity duration-200 hover:opacity-80"
            >
              <h1 className="text-2xl font-bold">Notes Talking</h1>
            </Link>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3">
            {status === "loading" ? (
              <div className="h-8 w-32 rounded bg-gray-200 animate-pulse" />
            ) : session ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium max-w-[160px] truncate">
                    {displayName}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gray-200 text-xs">
                      {initials || "US"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmOpen(true)}
                  title="Logout"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button size="sm">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Modal konfirmasi logout */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Keluar dari akun?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Kamu akan keluar dari sesi saat ini. Kamu bisa masuk lagi kapan saja.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleSignOut}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;
