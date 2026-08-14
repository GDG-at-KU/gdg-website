"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { collection, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, Timestamp, where } from "firebase/firestore";
import { GdgMember, MemberSignOut } from "./MemberAuth";
import { SectionMenu } from "./SectionMenu";
import { memberDb } from "../lib/firebase";

const ADMIN_EMAILS = ["heet2404@gmail.com"];
const ROTATION_MS = 45_000;

type EventSession = {
  id: string;
  title: string;
  active: boolean;
  checkInCode: string;
  codeExpiresAt?: { toDate?: () => Date };
};

function makeCode() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0")).join("");
}

function formatTime(value?: { toDate?: () => Date }) {
  const date = value?.toDate?.();
  return date ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "now";
}

export function AttendanceAdmin({ member }: { member: GdgMember }) {
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [status, setStatus] = useState("Ready to start an event session.");

  const isAdmin = ADMIN_EMAILS.includes(member.email.toLowerCase());
  const selected = useMemo(() => sessions.find((session) => session.id === selectedId) ?? sessions.find((session) => session.active) ?? null, [sessions, selectedId]);

  useEffect(() => {
    if (!memberDb || !isAdmin) return;
    return onSnapshot(collection(memberDb, "events"), (snapshot) => {
      const next = snapshot.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          title: typeof data.title === "string" ? data.title : "GDG KU event",
          active: data.active === true,
          checkInCode: typeof data.checkInCode === "string" ? data.checkInCode : "",
          codeExpiresAt: data.codeExpiresAt,
        };
      }).sort((a, b) => Number(b.active) - Number(a.active));
      setSessions(next);
      setSelectedId((current) => current || next.find((session) => session.active)?.id || next[0]?.id || "");
    }, () => setStatus("Firestore rules need to be published before organizer sessions can load."));
  }, [isAdmin]);

  useEffect(() => {
    if (!selected?.active || !selected.checkInCode) { setQrImage(""); return; }
    void QRCode.toDataURL(`GDGKU|${selected.id}|${selected.checkInCode}`, { width: 560, margin: 1, color: { dark: "#101d36", light: "#f6f4ef" } }).then(setQrImage);
  }, [selected]);

  useEffect(() => {
    if (!memberDb || !selected?.active) return;
    const interval = window.setInterval(() => void rotateCode(selected.id), ROTATION_MS);
    return () => window.clearInterval(interval);
  }, [selected?.id, selected?.active]);

  async function rotateCode(eventId: string) {
    if (!memberDb) return;
    const codeExpiresAt = Timestamp.fromDate(new Date(Date.now() + ROTATION_MS + 10_000));
    await setDoc(doc(memberDb, "events", eventId), { checkInCode: makeCode(), codeExpiresAt, updatedAt: serverTimestamp() }, { merge: true });
    setStatus("QR refreshed — the current code expires at " + formatTime({ toDate: () => codeExpiresAt.toDate() }) + ".");
  }

  async function startSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberDb || !title.trim()) return;
    const reference = doc(collection(memberDb, "events"));
    const codeExpiresAt = Timestamp.fromDate(new Date(Date.now() + ROTATION_MS + 10_000));
    await setDoc(reference, {
      title: title.trim(), active: true, checkInCode: makeCode(), codeExpiresAt,
      createdBy: member.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    setSelectedId(reference.id);
    setTitle("");
    setStatus("Session started. Put the QR on the projector at the room entrance.");
  }

  async function stopSession() {
    if (!memberDb || !selected) return;
    await setDoc(doc(memberDb, "events", selected.id), { active: false, updatedAt: serverTimestamp() }, { merge: true });
    setStatus("Session closed. New check-ins are now blocked.");
  }

  async function exportAttendance() {
    if (!memberDb || !selected) return;
    const snapshot = await getDocs(query(collection(memberDb, "attendance"), where("eventId", "==", selected.id)));
    const rows = [["memberId", "event", "checkedInAt"], ...snapshot.docs.map((entry) => {
      const data = entry.data();
      return [String(data.memberId ?? ""), selected.title, data.checkedInAt?.toDate?.().toISOString?.() ?? ""];
    })];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `${selected.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-attendance.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (!isAdmin) return <main className="admin-page"><SectionMenu /><section className="admin-denied"><p className="member-eyebrow">GDG KU ORGANIZER ACCESS</p><h1>Organizer<br /><i>only.</i></h1><p>This dashboard is available only to approved GDG KU organizers.</p><a href="/member">Return to my pass →</a></section></main>;

  return <main className="admin-page">
    <nav className="member-nav site-header"><a href="/" className="member-brand">GDG <span /> <em>ON CAMPUS<br />KU</em></a><div className="member-nav-actions"><MemberSignOut /></div><SectionMenu /></nav>
    <section className="admin-shell">
      <div className="admin-heading"><div><p className="member-eyebrow">GDG KU ORGANIZER TOOL</p><h1>Attendance,<br /><i>on autopilot.</i></h1><p>Start one session, display the changing QR code, and let signed-in members check themselves in.</p></div><form onSubmit={startSession}><label>NEW EVENT TITLE<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Build Night — September" /></label><button type="submit">Start session →</button></form></div>
      <div className="admin-session-picker"><span>EVENT SESSIONS</span><div>{sessions.map((session) => <button key={session.id} className={selected?.id === session.id ? "selected" : ""} onClick={() => setSelectedId(session.id)}>{session.active ? "LIVE · " : "CLOSED · "}{session.title}</button>)}</div></div>
      {selected ? <section className="admin-live-session"><div className="admin-qr">{selected.active && qrImage ? <img src={qrImage} alt={`Live attendance QR for ${selected.title}`} /> : <p>Session closed</p>}</div><div className="admin-session-copy"><p className="member-eyebrow">{selected.active ? "LIVE CHECK-IN" : "SESSION CLOSED"}</p><h2>{selected.title}</h2><p>{selected.active ? `This QR refreshes automatically every 45 seconds. Current code valid until ${formatTime(selected.codeExpiresAt)}.` : "This event is closed and cannot accept more check-ins."}</p><div className="admin-actions">{selected.active ? <><button onClick={() => void rotateCode(selected.id)}>Refresh QR now</button><button className="danger" onClick={() => void stopSession()}>End session</button></> : null}<button className="outline" onClick={() => void exportAttendance()}>Export CSV ↓</button></div><small>{status}</small></div></section> : <p className="admin-empty">Create your first event session to generate its live QR.</p>}
    </section>
  </main>;
}
