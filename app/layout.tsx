import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getUser } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/config";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "Piano Coach",
  description: "Upload a clip of your piano playing and get finger tracking and beginner-friendly coaching.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="en">
      <body>
        <header className="top">
          <Link href="/" className="brand">🎹 Piano Coach</Link>
          <nav>
            {!hasSupabase ? (
              <span className="muted">Guest mode</span>
            ) : user ? (
              <>
                <Link href="/history">History</Link>
                <SignOutButton />
              </>
            ) : (
              <Link href="/login">Sign in</Link>
            )}
          </nav>
        </header>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
