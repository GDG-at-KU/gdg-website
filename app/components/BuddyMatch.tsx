"use client";

import { useEffect, useMemo, useState } from "react";
import { GdgMember, MemberSignOut } from "./MemberAuth";
import { SectionMenu } from "./SectionMenu";
import { BuddyPreferences, BuddyRequest, DirectoryMember, blankBuddyPreferences, loadBuddyPreferences, loadBuddyRequests, loadDirectory, loadProfile, respondToBuddyRequest, saveBuddyPreferences, sendBuddyRequest } from "../lib/memberData";

const goals = ["Build a project", "Study together", "Interview prep", "Explore a track"];
const availabilityOptions = ["Weekday mornings", "Weekday evenings", "Weekends", "Flexible"];

function words(value: string) { return new Set(value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)); }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "GD"; }

export function BuddyMatch({ member }: { member: GdgMember }) {
  const [mine, setMine] = useState("");
  const [name, setName] = useState("GDG KU member");
  const [builders, setBuilders] = useState<DirectoryMember[]>([]);
  const [preferences, setPreferences] = useState<BuddyPreferences>(blankBuddyPreferences);
  const [requests, setRequests] = useState<BuddyRequest[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Finding builders with shared interests...");
  const [notice, setNotice] = useState("");

  async function refreshRequests() { setRequests(await loadBuddyRequests(member.uid)); }

  useEffect(() => {
    let active = true;
    Promise.all([loadProfile(member.uid), loadDirectory(), loadBuddyPreferences(member.uid), loadBuddyRequests(member.uid)]).then(([profile, directory, savedPreferences, savedRequests]) => {
      if (!active) return;
      setMine(profile.interests); setName(profile.displayName || "GDG KU member"); setBuilders(directory.filter((builder) => builder.uid !== member.uid)); setPreferences(savedPreferences); setRequests(savedRequests); setStatus("");
    }).catch(() => active && setStatus("Buddy Match will appear after Firestore rules are published and profiles are saved."));
    return () => { active = false; };
  }, [member.uid]);

  const matches = useMemo(() => {
    const mineSet = words(mine), term = search.trim().toLowerCase();
    return builders.map((builder) => ({ builder, shared: [...words(builder.interests)].filter((interest) => mineSet.has(interest)) })).filter(({ builder, shared }) => !term || [builder.displayName, builder.major, builder.interests, builder.leetCodeUsername, ...shared].join(" ").toLowerCase().includes(term)).sort((a, b) => b.shared.length - a.shared.length || a.builder.displayName.localeCompare(b.builder.displayName));
  }, [builders, mine, search]);

  async function savePreferences() {
    try { await saveBuddyPreferences(member.uid, preferences); setNotice("Your Buddy Match preferences are saved."); }
    catch { setNotice("Could not save preferences. Publish the updated Firestore rules, then try again."); }
  }

  async function requestBuddy(builder: DirectoryMember) {
    try {
      await sendBuddyRequest({ fromUid: member.uid, toUid: builder.uid, fromName: name, goal: preferences.goal, availability: preferences.availability });
      await refreshRequests(); setNotice(`Request sent to ${builder.displayName}.`);
    } catch { setNotice("Could not send this request. Publish the updated Firestore rules, then try again."); }
  }

  async function respond(request: BuddyRequest, response: "accepted" | "declined") {
    try { await respondToBuddyRequest(request.id, response); await refreshRequests(); setNotice(response === "accepted" ? `You and ${request.fromName} are now connected. Introduce yourself in Discord.` : "Request declined."); }
    catch { setNotice("Could not update this request. Please try again."); }
  }

  const incoming = requests.filter((request) => request.toUid === member.uid && request.status === "pending");
  const sentTo = new Set(requests.filter((request) => request.fromUid === member.uid && request.status === "pending").map((request) => request.toUid));
  const connections = requests.filter((request) => request.status === "accepted").map((request) => {
    const peerId = request.fromUid === member.uid ? request.toUid : request.fromUid;
    const peer = builders.find((builder) => builder.uid === peerId);
    return { ...request, peerName: request.fromUid === member.uid ? (peer?.displayName || "GDG KU buddy") : request.fromName };
  });

  async function copyIntroduction(peerName: string, request: BuddyRequest) {
    const introduction = `Hi ${peerName}! We matched through GDG KU Buddy Match for ${request.goal}. I am usually available ${request.availability.toLowerCase()}. Want to plan a first session?`;
    try {
      await navigator.clipboard.writeText(introduction);
      setNotice("Discord introduction copied. Paste it into your GDG KU message.");
    } catch {
      setNotice("Your connection is ready. Open Discord and introduce yourself to your buddy.");
    }
  }

  return <main className="buddy-page">
    <nav className="member-nav buddy-nav"><a href="/" className="member-brand">GDG <span /> <em>ON CAMPUS<br />KU</em></a><div className="member-nav-actions"><a className="member-admin-link" href="/members">Directory</a><MemberSignOut /></div><SectionMenu /></nav>
    <section className="buddy-hero"><div><p className="member-eyebrow">GDG KU / BUDDY MATCH</p><h1>Find a<br /><i>co-builder.</i></h1><p>Meet someone to make progress with—on a project, a technical skill, or your next interview goal.</p></div><aside className="buddy-goals"><span>WHAT ARE YOU HERE FOR?</span><div>{goals.map((item) => <button className={preferences.goal === item ? "active" : ""} type="button" key={item} onClick={() => setPreferences((current) => ({ ...current, goal: item }))}>{item}<b>{preferences.goal === item ? "✓" : "+"}</b></button>)}</div></aside></section>
    <section className="buddy-match-shell"><header className="buddy-match-head"><div><p className="member-eyebrow">YOUR SUGGESTIONS</p><h2>People to<br /><i>start with.</i></h2></div><div className="buddy-profile-note"><b>{mine.trim() ? "Matched from your interests" : "Complete your profile for better matches"}</b><p>{mine.trim() ? "Shared interests are ranked first. Update them anytime from your member pass." : "Add interests such as AI, frontend, cloud, or interview prep to make matching useful."}</p><a href="/member#profile">Edit my interests →</a></div></header>
      <section className="buddy-preferences"><div><span>WHEN CAN YOU MEET?</span><p>Only your connection request includes this preference.</p></div><select value={preferences.availability} onChange={(event) => setPreferences((current) => ({ ...current, availability: event.target.value }))}>{availabilityOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select><button type="button" onClick={() => void savePreferences()}>Save preferences →</button></section>
      {incoming.length > 0 && <section className="buddy-inbox"><div><span>BUDDY REQUESTS</span><h3>{incoming.length} waiting for you</h3></div>{incoming.map((request) => <article key={request.id}><b>{request.fromName}</b><p>{request.goal} · {request.availability}</p><button onClick={() => void respond(request, "accepted")}>Accept</button><button className="buddy-decline" onClick={() => void respond(request, "declined")}>Decline</button></article>)}</section>}
      {connections.length > 0 && <section className="buddy-connections"><header><span>MY CONNECTIONS</span><h3>{connections.length} builder {connections.length === 1 ? "buddy" : "buddies"}</h3></header><div>{connections.map((connection) => <article key={connection.id}><p>CONNECTED</p><h4>{connection.peerName}</h4><span>{connection.goal} · {connection.availability}</span><button type="button" onClick={() => void copyIntroduction(connection.peerName, connection)}>Copy Discord intro →</button></article>)}</div></section>}
      {notice && <p className="buddy-notice" role="status">{notice}</p>}
      <div className="buddy-toolbar"><label><span>SEARCH PEOPLE</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, interest, major, or LeetCode" /></label><p><b>{preferences.goal}</b><span>Current matching goal</span></p></div>
      {status ? <p className="buddy-status">{status}</p> : matches.length ? <div className="buddy-grid">{matches.map(({ builder, shared }, index) => <article className="buddy-card" key={builder.uid}><div className="buddy-card-top"><b>{initials(builder.displayName)}</b><span>0{index + 1}</span></div><p className="buddy-card-label">{shared.length ? `${shared.length} shared interest${shared.length === 1 ? "" : "s"}` : "GDG KU builder"}</p><h3>{builder.displayName}</h3><p className="buddy-major">{builder.major || "GDG KU builder"}{builder.graduationYear ? ` · ${builder.graduationYear}` : ""}</p><div className="buddy-tags">{(shared.length ? shared : builder.interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 3)).map((interest) => <span key={interest}>{interest}</span>)}</div><footer>{builder.leetCodeUsername ? <a href={`https://leetcode.com/u/${encodeURIComponent(builder.leetCodeUsername)}/`} target="_blank" rel="noreferrer">View LeetCode ↗</a> : <span>PROFILE COMPLETE</span>}<button type="button" disabled={sentTo.has(builder.uid)} onClick={() => void requestBuddy(builder)}>{sentTo.has(builder.uid) ? "Request sent" : "Connect"} <b>→</b></button></footer></article>)}</div> : <p className="buddy-status">No members match that search yet. Try a broader interest or visit the directory.</p>}
      <div className="buddy-next"><span>HOW IT WORKS</span><p>A request shares only your name, matching goal, and availability. After it is accepted, introduce yourselves through the GDG KU Discord.</p></div>
    </section>
  </main>;
}
