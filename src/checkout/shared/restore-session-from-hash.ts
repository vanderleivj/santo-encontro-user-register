import { supabase } from "../../lib/supabase";

export async function restoreSessionFromHash(): Promise<void> {
  const hash = globalThis.location?.hash?.slice(1);
  if (!hash) return;

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return;

  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  globalThis.history?.replaceState(
    null,
    "",
    globalThis.location?.pathname + (globalThis.location?.search || "")
  );
}
