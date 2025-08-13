// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth(() => {}, {
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token, req }) => {
      const p = req.nextUrl.pathname;

      // Selalu lepas untuk asset & API
      if (p.startsWith("/api/") || p.startsWith("/_next/")) return true;

      // ✅ Halaman public
      if (p === "/" || p.startsWith("/p/") || p.startsWith("/login") || p.startsWith("/register"))
        return true;

      // Yang lain butuh login
      return !!token;
    },
  },
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
