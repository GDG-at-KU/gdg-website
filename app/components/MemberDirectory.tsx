"use client";

import { useEffect, useMemo, useState } from "react";
import { GdgMember, MemberSignOut } from "./MemberAuth";
import { SectionMenu } from "./SectionMenu";
import { DirectoryMember, loadDirectory } from "../lib/memberData";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "GD";
}

export function MemberDirectory({ member }: { member: GdgMember }) {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Loading verified builder profiles...");

  useEffect(() => {
    void loadDirectory().then((records) => {
      setMembers(records);
      setStatus(records.length ? "" : "The directory will appear as members complete their profiles.");
    }).catch(() => setStatus("The member directory is unavailable until the Firestore rules are published."));
  }, []);

  const visibleMembers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return members;
    return members.filter((profile) => [profile.displayName, profile.major, profile.graduationYear, profile.leetCodeUsername, profile.interests].join(" ").toLowerCase().includes(term));
  }, [members, query]);

  return <main className="members-page">
    <nav className="member-nav site-header"><a href="/" className="member-brand">GDG <span /> <em>ON CAMPUS<br />KU</em></a><div className="member-nav-actions"><MemberSignOut /></div><SectionMenu /></nav>
    <section className="members-hero"><div className="members-hero-copy"><p className="member-eyebrow">GDG ON CAMPUS / KU</p><h1>Meet your<br /><i>builders.</i></h1><p>Find classmates working on similar ideas, studying for the same challenge, or looking for their next project collaborator.</p></div><aside><span>PUBLIC PROFILES</span><b>{members.length}</b><small>signed-in builder profiles</small></aside></section>
    <section className="members-directory" aria-labelledby="directory-title">
      <div className="members-directory-head"><div><p className="member-eyebrow">COMMUNITY DIRECTORY</p><h2 id="directory-title">Find your<br /><i>people.</i></h2></div><a href="/member#profile">Edit my profile <span>-&gt;</span></a></div>
      <label className="members-search"><span>SEARCH BUILDERS</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, major, LeetCode, or interest" /></label>
      {status ? <p className="members-status" role="status">{status}</p> : <div className="members-grid">{visibleMembers.map((profile, index) => <article className="directory-card" key={profile.uid}><div className="directory-card-top"><b>{initials(profile.displayName)}</b><span>0{index + 1}</span></div><h3>{profile.displayName}</h3><p>{profile.major || "GDG KU builder"}{profile.graduationYear ? ` / ${profile.graduationYear}` : ""}</p><ul>{profile.interests.split(",").map((interest) => interest.trim()).filter(Boolean).slice(0, 4).map((interest) => <li key={interest}>{interest}</li>)}</ul><footer>{profile.leetCodeUsername ? <a href={`https://leetcode.com/u/${encodeURIComponent(profile.leetCodeUsername)}/`} target="_blank" rel="noreferrer">@{profile.leetCodeUsername} -&gt;</a> : <span>BUILD / LEARN / CONNECT</span>}</footer></article>)}</div>}
      {!status && !visibleMembers.length && <p className="members-status">No builders match that search yet.</p>}
    </section>
  </main>;
}
