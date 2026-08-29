"use client";

import { useState } from "react";
import { AttendanceScanner } from "../components/AttendanceScanner";
import { DiscordConnect } from "../components/DiscordConnect";
import { GdgMember, MemberAuth, MemberSignOut } from "../components/MemberAuth";
import { MemberIdentityCard } from "../components/MemberIdentityCard";
import { MemberProfile } from "../components/MemberProfile";
import { SectionMenu } from "../components/SectionMenu";
import { blankProfile, MemberProfile as Profile } from "../lib/memberData";

const ORGANIZER_EMAILS = ["heet2404@gmail.com", "hpa2309@gmail.com"];

function MemberPass({ member }: { member: GdgMember }) {
  const [profile, setProfile] = useState<Profile>(blankProfile);
  const [discordConnected, setDiscordConnected] = useState(false);
  return <main className={"member-page"}>
    <nav className={"member-nav site-header"}><a href="/" className={"member-brand"}>GDG <span /> <em>ON CAMPUS<br />KU</em></a><div className={"member-nav-actions"}>{ORGANIZER_EMAILS.includes(member.email.toLowerCase()) && <a className="member-admin-link" href="/admin/attendance">Attendance</a>}<MemberSignOut /></div><SectionMenu /></nav>
    <section className={"member-hero"}>
      <div><p className={"member-eyebrow"}>YOUR GDG KU PASS</p><h1>Carry the<br /><i>community.</i></h1><p className={"member-intro"}>Your verified email is connected to this phone. Scan in at events without filling out a form again.</p><a className="member-directory-cta" href="/buddies">Find a co-builder <span>→</span></a></div>
      <MemberIdentityCard member={member} profile={profile} />
    </section>
    <DiscordConnect member={member} onConnectionChange={setDiscordConnected} />
    <MemberProfile member={member} onProfileChange={setProfile} />
    <AttendanceScanner member={member} discordConnected={discordConnected} />
    <section className={"member-roadmap"}><p className={"member-eyebrow"}>YOUR MEMBER SYSTEM</p><h2>One pass.<br /><i>More momentum.</i></h2><div><article><span>01</span><h3>Email verified</h3><p>Your verified email connects this device to your GDG KU member profile.</p></article><article><span>02</span><h3>Attendance ready</h3><p>Each event scan is validated against the active session before a check-in is recorded.</p></article><article><span>03</span><h3>Builder buddies</h3><p>Match with students for LeetCode, projects, and study sessions.</p></article></div></section>
  </main>;
}

export default function MemberPage() {
  return <MemberAuth>{(member) => <MemberPass member={member} />}</MemberAuth>;
}
