"use client";

import { AttendanceScanner } from "../components/AttendanceScanner";
import { GdgMember, MemberAuth, MemberSignOut } from "../components/MemberAuth";
import { MemberProfile } from "../components/MemberProfile";
import { SectionMenu } from "../components/SectionMenu";

function MemberPass({ member }: { member: GdgMember }) {
  return <main className={"member-page"}>
    <nav className={"member-nav"}><a href="/" className={"member-brand"}>GDG <span /> <em>ON CAMPUS<br />KU</em></a><div className={"member-nav-actions"}><span>{member.email}</span><MemberSignOut /><SectionMenu /></div></nav>
    <section className={"member-hero"}>
      <div><p className={"member-eyebrow"}>YOUR GDG KU PASS</p><h1>Carry the<br /><i>community.</i></h1><p className={"member-intro"}>Your verified email is connected to this phone. Scan in at events without filling out a form again.</p></div>
      <div className="member-pass" aria-label="GDG on Campus KU member pass"><div className="member-pass-top"><span>GOOGLE DEVELOPER GROUPS</span><b>KU</b></div><div><strong>GDG</strong><p>{member.email}</p></div><div className="member-pass-bottom"><span>VERIFIED MEMBER</span><span>2026</span></div></div>
    </section>
    <section className={"member-stats"} aria-label="Member activity"><article><span>01</span><b>Upcoming</b><strong>Build Night</strong><p>Sep 05 at 6:00 PM</p></article><article><span>02</span><b>Attendance</b><strong>Ready to scan</strong><p>Your member ID is active</p></article><article><span>03</span><b>Next release</b><strong>Buddy match</strong><p>Find a LeetCode partner</p></article></section>
    <MemberProfile member={member} />
    <AttendanceScanner member={member} />
    <section className={"member-roadmap"}><p className={"member-eyebrow"}>YOUR MEMBER SYSTEM</p><h2>One pass.<br /><i>More momentum.</i></h2><div><article><span>01</span><h3>Email verified</h3><p>Your verified email proves that this device belongs to a GDG KU member.</p></article><article><span>02</span><h3>Attendance next</h3><p>Every scan will be linked to this member ID and checked by the server.</p></article><article><span>03</span><h3>Builder buddies</h3><p>Match with students for LeetCode, projects, and study sessions.</p></article></div></section>
  </main>;
}

export default function MemberPage() {
  return <MemberAuth>{(member) => <MemberPass member={member} />}</MemberAuth>;
}
