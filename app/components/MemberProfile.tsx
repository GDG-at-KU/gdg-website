"use client";

import { FormEvent, useEffect, useState } from "react";
import type { GdgMember } from "./MemberAuth";
import { blankProfile, loadProfile, MemberProfile as Profile, saveProfile } from "../lib/memberData";

export function MemberProfile({ member, onProfileChange }: { member: GdgMember; onProfileChange?: (profile: Profile) => void }) {
  const [profile, setProfile] = useState<Profile>(blankProfile);
  const [status, setStatus] = useState("Loading your profile...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void loadProfile(member.uid).then((saved) => {
      if (!active) return;
      setProfile(saved);
      onProfileChange?.(saved);
      setStatus(saved.displayName || saved.leetCodeUsername ? "Profile saved to your member account." : "Complete your profile to join the member directory.");
    }).catch(() => active && setStatus("Enable Firestore to save your profile."));
    return () => { active = false; };
  }, [member.uid]);

  function update(field: keyof Profile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setStatus("Saving...");
      await Promise.race([
        saveProfile(member.uid, member.email, profile),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("timeout")), 10000)),
      ]);
      onProfileChange?.(profile);
      setStatus("Profile saved. Your details stay attached to this member account.");
    } catch {
      setStatus("Could not reach Firestore. Create Firestore Database and publish its rules, then try again.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="member-profile" id="profile" aria-labelledby="profile-title">
    <div><p className="member-eyebrow">MEMBER PROFILE</p><h2 id="profile-title">Make your<br /><i>builder card.</i></h2><p>Save only what helps members find the right collaborator. Your email is never shown in the public directory.</p></div>
    <form onSubmit={submit}>
      <label>Display name<input value={profile.displayName} onChange={(event) => update("displayName", event.target.value)} placeholder="How should members know you?" maxLength={60} /></label>
      <label>Major or program<input value={profile.major} onChange={(event) => update("major", event.target.value)} placeholder="e.g. Computer Science" maxLength={80} /></label>
      <label>Graduation year<input value={profile.graduationYear} onChange={(event) => update("graduationYear", event.target.value)} placeholder="e.g. 2028" inputMode="numeric" maxLength={4} /></label>
      <label>LeetCode username<input value={profile.leetCodeUsername} onChange={(event) => update("leetCodeUsername", event.target.value.replace(/^@/, ""))} placeholder="e.g. jayhawk_builder" maxLength={60} /></label>
      <label className="member-profile-wide">Interests (comma-separated)<input value={profile.interests} onChange={(event) => update("interests", event.target.value)} placeholder="AI, web development, interview prep" maxLength={160} /></label>
      {profile.leetCodeUsername && <a className="member-leetcode-link" href={`https://leetcode.com/u/${encodeURIComponent(profile.leetCodeUsername)}/`} target="_blank" rel="noreferrer">Open @{profile.leetCodeUsername} on LeetCode ↗</a>}
      <div className="member-profile-action"><span role="status">{status}</span><button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button></div>
    </form>
  </section>;
}
