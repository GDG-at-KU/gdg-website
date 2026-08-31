"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { collection, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, Timestamp, where } from "firebase/firestore";
import { GdgMember, MemberSignOut } from "./MemberAuth";
import { SectionMenu } from "./SectionMenu";
import { memberAuth, memberDb } from "../lib/firebase";

const ADMIN_EMAILS = ["heet2404@gmail.com", "hpa2309@gmail.com"];
const ROTATION_MS = 45_000;
const WRAP_UP_DURATION_MS = 15 * 60_000;

type EventSession = {
  id: string;
  title: string;
  active: boolean;
  checkInCode: string;
  codeExpiresAt?: { toDate?: () => Date };
  engagementActive?: boolean;
  engagementCode?: string;
  engagementExpiresAt?: { toDate?: () => Date };
  attendanceEligible?: boolean;
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
  const [question, setQuestion] = useState("Which idea from today best describes the session?");
  const [options, setOptions] = useState(["The main concept", "A common misconception", "A useful next step", "All of the above"]);
  const [correctAnswer, setCorrectAnswer] = useState(3);
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
          engagementActive: data.engagementActive === true,
          engagementCode: typeof data.engagementCode === "string" ? data.engagementCode : "",
          engagementExpiresAt: data.engagementExpiresAt,
          attendanceEligible: data.attendanceEligible === true,
        };
      }).sort((a, b) => Number(b.active) - Number(a.active));
      setSessions(next);
      setSelectedId((current) => current || next.find((session) => session.active)?.id || next[0]?.id || "");
    }, () => setStatus("Firestore rules need to be published before organizer sessions can load."));
  }, [isAdmin]);

  useEffect(() => {
    const isWrapUp = selected?.engagementActive && selected.engagementCode;
    const code = isWrapUp ? selected?.engagementCode : selected?.checkInCode;
    if (!code || (!selected?.active && !isWrapUp)) { setQrImage(""); return; }
    void QRCode.toDataURL(`${isWrapUp ? "GDGKU-END" : "GDGKU"}|${selected!.id}|${code}`, { width: 560, margin: 1, color: { dark: "#101d36", light: "#f6f4ef" } }).then(setQrImage);
  }, [selected]);

  useEffect(() => {
    if (!memberDb || !selected?.active) return;
    const interval = window.setInterval(() => void rotateCode(selected.id), ROTATION_MS);
    return () => window.clearInterval(interval);
  }, [selected?.id, selected?.active]);

  async function rotateCode(eventId: string, wrapUp = false) {
    if (!memberDb) return;
    const codeExpiresAt = Timestamp.fromDate(new Date(Date.now() + (wrapUp ? WRAP_UP_DURATION_MS : ROTATION_MS + 10_000)));
    await setDoc(doc(memberDb, "events", eventId), wrapUp ? { engagementCode: makeCode(), engagementExpiresAt: codeExpiresAt, updatedAt: serverTimestamp() } : { checkInCode: makeCode(), codeExpiresAt, updatedAt: serverTimestamp() }, { merge: true });
    setStatus("QR refreshed — the current code expires at " + formatTime({ toDate: () => codeExpiresAt.toDate() }) + ".");
  }

  async function startSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberDb || !title.trim() || !question.trim() || options.some((option) => !option.trim())) return;
    const reference = doc(collection(memberDb, "events"));
    const codeExpiresAt = Timestamp.fromDate(new Date(Date.now() + ROTATION_MS + 10_000));
    await setDoc(reference, {
      title: title.trim(), active: true, checkInCode: makeCode(), codeExpiresAt, engagementActive: false,
      engagementCode: "", engagementExpiresAt: null, attendanceEligible: false, completedAt: null, correctAnswer,
      createdBy: member.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    await setDoc(doc(memberDb, "engagementPrompts", reference.id), { title: title.trim(), question: question.trim(), options: options.map((option) => option.trim()), active: false, updatedAt: serverTimestamp() });
    setSelectedId(reference.id);
    setTitle("");
    setStatus("Session started. Put the QR on the projector at the room entrance.");
  }

  async function stopSession() {
    if (!memberDb || !selected) return;
    const countsForConsistency = selected.engagementActive === true;
    await setDoc(doc(memberDb, "events", selected.id), {
      active: false, engagementActive: false, attendanceEligible: countsForConsistency,
      completedAt: countsForConsistency ? serverTimestamp() : null, updatedAt: serverTimestamp(),
    }, { merge: true });
    await setDoc(doc(memberDb, "engagementPrompts", selected.id), { active: false, updatedAt: serverTimestamp() }, { merge: true });
    if (!countsForConsistency) {
      setStatus("Session closed. It will not count toward Discord access because no wrap-up was opened.");
      return;
    }
    try {
      const token = await memberAuth?.currentUser?.getIdToken();
      const response = await fetch("/api/discord/reconcile-roles", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const payload = await response.json() as { reviewed?: number; error?: string };
      if (!response.ok) throw new Error(payload.error || "Discord access could not be reviewed.");
      setStatus(`Session closed and counted. Discord access was reviewed for ${payload.reviewed || 0} connected members.`);
    } catch (error) {
      setStatus(`Session closed and counted. Discord review needs a retry: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  async function openWrapUp() {
    if (!memberDb || !selected) return;
    const expires = Timestamp.fromDate(new Date(Date.now() + WRAP_UP_DURATION_MS));
    await setDoc(doc(memberDb, "events", selected.id), { active: false, engagementActive: true, engagementCode: makeCode(), engagementExpiresAt: expires, updatedAt: serverTimestamp() }, { merge: true });
    await setDoc(doc(memberDb, "engagementPrompts", selected.id), { active: true, updatedAt: serverTimestamp() }, { merge: true });
    setStatus("Wrap-up QR is live for 15 minutes. Students must answer the session question and share a takeaway.");
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

  async function exportWrapUps() {
    if (!memberDb || !selected) return;
    const snapshot = await getDocs(query(collection(memberDb, "engagement"), where("eventId", "==", selected.id)));
    const rows = [["memberId", "event", "takeaway", "submittedAt"], ...snapshot.docs.map((entry) => {
      const data = entry.data();
      return [String(data.memberId ?? ""), selected.title, String(data.reflection ?? ""), data.submittedAt?.toDate?.().toISOString?.() ?? ""];
    })];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `${selected.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-wrap-ups.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  async function runAdminCleanup(path: string, body?: object) {
    const token = await memberAuth?.currentUser?.getIdToken();
    const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const payload = await response.json() as { error?: string; sessions?: number; attendance?: number; wrapUps?: number; profiles?: number; requests?: number };
    if (!response.ok) throw new Error(payload.error || "The cleanup could not be completed.");
    return payload;
  }

  async function removeClosedHistory() {
    if (!window.confirm("Delete every closed session and its check-ins, wrap-ups, and QR prompts? Live sessions will not be touched.")) return;
    try {
      const result = await runAdminCleanup("/api/admin/cleanup-closed-sessions");
      setStatus(`Removed ${result.sessions || 0} closed sessions, ${result.attendance || 0} check-ins, and ${result.wrapUps || 0} wrap-ups.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Closed session history could not be removed."); }
  }

  async function hideFormerMember() {
    if (!window.confirm("Hide heet3575@gmail.com from CoBuilder and remove their buddy requests? Their Firebase account and private profile will remain.")) return;
    try {
      const result = await runAdminCleanup("/api/admin/hide-directory-member", { email: "heet3575@gmail.com" });
      setStatus(`Removed ${result.profiles || 0} CoBuilder profile and ${result.requests || 0} buddy requests. Their Firebase account remains intact.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "The former member could not be hidden."); }
  }

  if (!isAdmin) return <main className="admin-page"><nav className="member-nav site-header"><a href="/" className="member-brand">GDG <span /> <em>ON CAMPUS<br />KU</em></a><div className="member-nav-actions"><MemberSignOut /></div><SectionMenu /></nav><section className="admin-denied"><p className="member-eyebrow">GDG KU ORGANIZER ACCESS</p><h1>Organizer<br /><i>only.</i></h1><p>This dashboard is available only to approved GDG KU organizers.</p><a href="/member">Return to my pass →</a></section></main>;

  return <main className="admin-page">
    <nav className="member-nav site-header"><a href="/" className="member-brand">GDG <span /> <em>ON CAMPUS<br />KU</em></a><div className="member-nav-actions"><MemberSignOut /></div><SectionMenu /></nav>
    <section className="admin-shell">
      <div className="admin-heading"><div><p className="member-eyebrow">GDG KU ORGANIZER TOOL</p><h1>Attendance,<br /><i>with learning.</i></h1><p>Start with a check-in QR, then end with a short understanding check and takeaway.</p></div><form onSubmit={startSession}><label>NEW EVENT TITLE<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Build Night — September" /></label><label>WRAP-UP QUESTION<input value={question} onChange={(event) => setQuestion(event.target.value)} /></label>{options.map((option, index) => <label key={index}>OPTION {index + 1}<input value={option} onChange={(event) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></label>)}<label>CORRECT OPTION<select value={correctAnswer} onChange={(event) => setCorrectAnswer(Number(event.target.value))}>{options.map((_, index) => <option value={index} key={index}>Option {index + 1}</option>)}</select></label><button type="submit">Start session →</button></form></div>
      <div className="admin-session-picker"><span>EVENT SESSIONS</span><div>{sessions.map((session) => <button key={session.id} className={selected?.id === session.id ? "selected" : ""} onClick={() => setSelectedId(session.id)}>{session.active ? "LIVE · " : "CLOSED · "}{session.title}</button>)}</div></div>
      <section className="admin-cleanup"><div><p className="member-eyebrow">ORGANIZER CLEANUP</p><h2>Remove test history.</h2><p>These actions preserve live sessions and the former member’s Firebase account.</p></div><div><button className="danger" type="button" onClick={() => void removeClosedHistory()}>Delete closed session history</button><button className="outline" type="button" onClick={() => void hideFormerMember()}>Hide former CoBuilder member</button></div></section>
      {selected ? <section className="admin-live-session"><div className="admin-qr">{(selected.active || selected.engagementActive) && qrImage ? <img src={qrImage} alt={`Live attendance QR for ${selected.title}`} /> : <p>Session closed</p>}</div><div className="admin-session-copy"><p className="member-eyebrow">{selected.engagementActive ? "LIVE SESSION WRAP-UP" : selected.active ? "LIVE CHECK-IN" : "SESSION CLOSED"}</p><h2>{selected.title}</h2><p>{selected.engagementActive ? "Students scan this QR, answer the learning check, and save one takeaway." : selected.active ? `This QR refreshes automatically every 45 seconds. Current code valid until ${formatTime(selected.codeExpiresAt)}.` : "This event is closed and cannot accept more check-ins."}</p><div className="admin-actions">{selected.active ? <><button onClick={() => void rotateCode(selected.id)}>Refresh QR now</button><button onClick={() => void openWrapUp()}>Open wrap-up QR</button></> : null}{selected.engagementActive ? <button onClick={() => void rotateCode(selected.id, true)}>Refresh wrap-up QR</button> : null}{(selected.active || selected.engagementActive) && <button className="danger" onClick={() => void stopSession()}>End session</button>}<button className="outline" onClick={() => void exportAttendance()}>Export check-ins ↓</button><button className="outline" onClick={() => void exportWrapUps()}>Export takeaways ↓</button></div><small>{status}</small></div></section> : <p className="admin-empty">Create your first event session to generate its live QR.</p>}
    </section>
  </main>;
}
