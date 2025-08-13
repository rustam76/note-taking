"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "next-auth/react";
import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

const ERROR_MAP: Record<string, string> = {
  CredentialsSignin: "Email atau password salah.",
  AccessDenied: "Akses ditolak.",
  OAuthAccountNotLinked: "Email ini sudah terhubung dengan metode login lain.",
  Configuration: "Konfigurasi login bermasalah.",
  Default: "Terjadi kesalahan. Coba lagi.",
};

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const sp = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const callbackUrl = sp.get("callbackUrl") || "/";

  const initialUrlError = sp.get("error");
  useMemo(() => {
    if (initialUrlError && !errMsg) {
      setErrMsg(ERROR_MAP[initialUrlError] ?? ERROR_MAP.Default);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrlError]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrMsg(null);
    try {
      const res = await signIn("credentials", {
        redirect: false, 
        email,
        password,
        callbackUrl,
      });

      if (!res) {
        setErrMsg(ERROR_MAP.Default);
        return;
      }
      if (res.ok) {
        router.replace(res.url ?? callbackUrl);
      } else {
        const code = res.error || "Default";
        setErrMsg(ERROR_MAP[code] ?? ERROR_MAP.Default);
      }
    } catch (err) {
      setErrMsg("Internal server error. Coba beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={onSubmit}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Note Taking</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Selamat datang, silakan login untuk melanjutkan.
        </p>
      </div>

      {/* Error message */}
      {errMsg && (
        <div
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
          aria-live="polite"
        >
          {errMsg}
        </div>
      )}

      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="m@example.com"
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="grid gap-3">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            required
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2Icon className="h-4 w-4 animate-spin" />
              Masuk...
            </span>
          ) : (
            "Masuk"
          )}
        </Button>
      </div>
    </form>
  );
}
