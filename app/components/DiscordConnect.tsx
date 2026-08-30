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
  const [accessReview, setAccessReview] = useState<{ consecutiveMisses: number; countedSessions: number; consistentMember: boolean } | null>(null);

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
      setMessage("Checking your Discord access...");
      const token = await memberAuth?.currentUser?.getIdToken();
      if (!token) throw new Error("missing session");
      const response = await fetch("/api/discord/sync-role", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json() as { consecutiveMisses?: number; countedSessions?: number; consistentMember?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not update your Discord roles.");
      const review = { consecutiveMisses: payload.consecutiveMisses || 0, countedSessions: payload.countedSessions || 0, consistentMember: payload.consistentMember !== false };
      setAccessReview(review);
      setMessage(review.consistentMember ? (review.countedSessions < 3 ? "Your Consistent Member access is active. It remains active until three counted GDG KU sessions are missed in a row." : `Your Consistent Member access is active. Current consecutive misses: ${review.consecutiveMisses}/3.`) : "Three counted GDG KU sessions were missed in a row, so Consistent Member access has been removed. Attend a counted session and check again to restore it.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update your Discord roles.");
    }
  }

  return <section className="discord-connect" id="discord-access">
    <div><p className="member-eyebrow">REQUIRED COMMUNITY ACCESS</p><h2>Connect<br /><i>Discord.</i></h2><p>Link the Discord account you use in GDG KU. You receive Consistent Member access and the internship notifier right away.</p></div>
    <aside>{loading ? <p>Checking Discord access...</p> : link ? <><span className="discord-connected">CONNECTED</span><h3>@{link.username}</h3><p>{link.consistentMember ? accessReview ? `Consistent Member is active. ${accessReview.consecutiveMisses}/3 counted sessions missed in a row.` : "Consistent Member access is active." : "Consistent Member access is currently paused after three consecutive missed counted sessions."}</p><button type="button" onClick={() => void syncRole()}>Check my access →</button></> : <><span>DISCORD MEMBERSHIP</span><h3>Join or verify</h3><p>New here? Join the GDG KU Discord first. Already in the server? Verify the Discord account you use there.</p><a href="https://discord.gg/BmKfZUnaQ" target="_blank" rel="noreferrer">Join Discord ↗</a><button type="button" onClick={() => void connect()}>Already joined? Verify my account →</button></>}</aside>
    {message && <p className="discord-message" role="status">{message}</p>}
  </section>;
}
