"use client";

import { useCallback, useEffect, useState } from "react";
import type { GdgMember } from "./MemberAuth";
import { memberAuth } from "../lib/firebase";
import { DiscordLink, loadDiscordLink } from "../lib/memberData";
import { discordCallbackNotice } from "../lib/discordCallback";

type Props = {
  member: GdgMember;
  onConnectionChange?: (linked: boolean) => void;
};

export function DiscordConnect({ member, onConnectionChange }: Props) {
  const [link, setLink] = useState<DiscordLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [completedEvents, setCompletedEvents] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const saved = await loadDiscordLink(member.uid);
      setLink(saved);
      onConnectionChange?.(Boolean(saved));
    } catch {
      setMessage("Discord access will be available after the updated Firestore rules are published.");
      onConnectionChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [member.uid, onConnectionChange]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const notice = discordCallbackNotice(window.location.search);
    if (!notice) return;

    setMessage(notice.message);
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("discord");
    cleanUrl.searchParams.delete("message");
    window.history.replaceState(window.history.state, "", cleanUrl);
  }, []);

  async function connect() {
    try {
      setMessage("Opening Discord securely...");
      const token = await memberAuth?.currentUser?.getIdToken();
      if (!token) throw new Error("missing session");
      const response = await fetch("/api/discord/connect", { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Discord connection is not configured yet.");
      window.location.assign(payload.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Discord connection could not start.");
    }
  }

  async function syncRole() {
    try {
      setMessage("Checking your completed sessions...");
      const token = await memberAuth?.currentUser?.getIdToken();
      if (!token) throw new Error("missing session");
      const response = await fetch("/api/discord/sync-role", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json() as { completedEvents?: number; consistentMember?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not update your Discord roles.");
      const total = payload.completedEvents || 0;
      setCompletedEvents(total);
      setMessage(payload.consistentMember ? "Consistent Member unlocked in Discord." : `${total}/2 completed sessions complete. Each session needs both check-in and the wrap-up learning check.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update your Discord roles.");
    }
  }

  return <section className="discord-connect" id="discord-access">
    <div><p className="member-eyebrow">REQUIRED COMMUNITY ACCESS</p><h2>Connect<br /><i>Discord.</i></h2><p>Link the Discord account you use in GDG KU. Two completed sessions unlock the Consistent Member role and the internship notifier.</p></div>
    <aside>{loading ? <p>Checking Discord access...</p> : link ? <><span className="discord-connected">CONNECTED</span><h3>@{link.username}</h3><p>{link.consistentMember ? "Consistent Member is active." : completedEvents === null ? "Check your progress to see completed sessions and unlock status." : `${completedEvents}/2 completed sessions. Each session needs check-in and the wrap-up learning check.`}</p><button type="button" onClick={() => void syncRole()}>Check my progress →</button></> : <><span>DISCORD MEMBERSHIP</span><h3>Join or verify</h3><p>New here? Join the GDG KU Discord first. Already in the server? Verify the Discord account you use there.</p><a href="https://discord.gg/BmKfZUnaQ" target="_blank" rel="noreferrer">Join Discord ↗</a><button type="button" onClick={() => void connect()}>Already joined? Verify my account →</button></>}</aside>
    {message && <p className="discord-message" role="status">{message}</p>}
  </section>;
}
