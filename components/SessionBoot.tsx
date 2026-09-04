"use client";
import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase-client";

/**
 * Consumes Supabase auth redirects (magic-link / OTP link hash fragments)
 * on whatever page the user lands on — e.g. `/` — so the session is
 * established before they reach an authed page like /dashboard.
 * Renders nothing.
 */
export default function SessionBoot() {
  useEffect(() => {
    supabaseBrowser()
      .auth.getSession()
      .catch(() => {});
  }, []);
  return null;
}
