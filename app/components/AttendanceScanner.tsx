"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { GdgMember } from "./MemberAuth";
import { beginAttendance, saveWrapUp, WrapUpPrompt } from "../lib/memberData";

type ScannerControls = { stop: () => void };

export function AttendanceScanner({ member, discordConnected }: { member: GdgMember; discordConnected: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapUpRef = useRef<HTMLFormElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [wrapUp, setWrapUp] = useState<{ prompt: WrapUpPrompt; code: string } | null>(null);
  const [answerIndex, setAnswerIndex] = useState<number | null>(null);
  const [reflection, setReflection] = useState("");
  const [isSubmittingWrapUp, setIsSubmittingWrapUp] = useState(false);

  const stopScan = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setIsScanning(false);
  };

  useEffect(() => () => controlsRef.current?.stop(), []);

  useEffect(() => {
    if (wrapUp) wrapUpRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [wrapUp]);

  async function recordCheckIn(rawCode: string) {
    try {
      setError(null);
      const response = await beginAttendance(member.uid, rawCode);
      if (response.kind === "wrapup") {
        setWrapUp({ prompt: response.prompt, code: response.code });
        setResult(null);
      } else setResult("Check-in recorded");
    } catch (reason) {
      setResult(null);
      setError(reason instanceof Error ? reason.message : "We could not verify this attendance code. Scan the current event QR code.");
    }
  }

  async function startScan() {
    setError(null);
    setResult(null);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        videoRef.current ?? undefined,
        (scanResult) => {
          if (!scanResult) return;
          void recordCheckIn(scanResult.getText());
          controlsRef.current?.stop();
          controlsRef.current = null;
          setIsScanning(false);
        },
      );
      controlsRef.current = controls;
      setIsScanning(true);
    } catch {
      setError("Camera access was not available. Allow camera access, or enter the event code below.");
      setIsScanning(false);
    }
  }

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    void recordCheckIn(code);
    setManualCode("");
  }

  async function submitWrapUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wrapUp || answerIndex === null) {
      setError("Choose an answer before submitting your wrap-up.");
      return;
    }
    try {
      setError(null);
      setResult(null);
      setIsSubmittingWrapUp(true);
      const response = await saveWrapUp(member.uid, wrapUp.prompt, wrapUp.code, answerIndex, reflection);
      setResult(response.alreadySubmitted
        ? "This session wrap-up was already submitted."
        : "Wrap-up completed — thank you for learning with us.");
      setWrapUp(null); setReflection(""); setAnswerIndex(null);
    } catch (reason) {
      setResult(null);
      setError(reason instanceof Error ? reason.message : "Your response could not be saved. Check the current wrap-up QR and try again.");
    } finally {
      setIsSubmittingWrapUp(false);
    }
  }

  if (!discordConnected) return <section className="member-scanner member-discord-lock" aria-labelledby="attendance-title">
    <div className="member-scanner-head"><div><p className="member-eyebrow">MEMBER CHECK-IN</p><h2 id="attendance-title">Connect first.<br /><i>Then scan.</i></h2></div><span className="member-live-dot">DISCORD REQUIRED</span></div>
    <p>Attendance is tied to your Discord membership so completed sessions can unlock community roles. Connect Discord above before using event QR codes.</p>
    <a href="#discord-access">Connect Discord →</a>
  </section>;

  return (
    <section className={"member-scanner"} aria-labelledby="attendance-title">
      <div className="member-scanner-head">
        <div><p className={"member-eyebrow"}>MEMBER CHECK-IN</p><h2 id="attendance-title">Scan in.<br /><i>Show up.</i></h2></div>
        <span className={"member-live-dot"}>LIVE CAMERA</span>
      </div>
      <div className={"member-camera-frame"}>
        <video ref={videoRef} className={"member-camera-video"} muted playsInline autoPlay aria-label="Camera preview for scanning an event QR code" />
        {!isScanning && !result && <div className={"member-camera-placeholder"}><b>QR</b><span>Ready when you are</span></div>}
        {isScanning && <div className={"member-scan-guide"} aria-hidden="true" />}
      </div>
      <div className="member-scanner-actions">
        {!isScanning ? <button className={"member-scan-button"} onClick={startScan}>Open camera</button> : <button className={"member-stop-button"} onClick={stopScan}>Stop camera</button>}
        <p>Each check-in is linked to your member account. Scan the live QR shown by the organizer during the event.</p>
      </div>
      {error && <p className={"member-error"}>{error}</p>}
      {result && <div className={"member-scan-result"}><span>CHECK-IN SAVED</span><b>{result}</b><p>You are checked in. Scanning again will not create a duplicate.</p></div>}
      {wrapUp && <form ref={wrapUpRef} className="member-wrapup" onSubmit={submitWrapUp}><p className="member-eyebrow">SESSION WRAP-UP · {wrapUp.prompt.title}</p><h3>{wrapUp.prompt.question}</h3><div>{wrapUp.prompt.options.map((option, index) => <label key={option}><input type="radio" name="wrapup-answer" checked={answerIndex === index} onChange={() => setAnswerIndex(index)} /> {option}</label>)}</div><label>One thing you learned <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} maxLength={280} placeholder="A short takeaway helps us improve the next session." required /></label><button type="submit" disabled={answerIndex === null || isSubmittingWrapUp}>{isSubmittingWrapUp ? "Saving wrap-up…" : "Submit wrap-up →"}</button></form>}
      <form className={"member-manual-form"} onSubmit={submitManual}><label htmlFor="attendance-code">Camera not working?</label><div><input id="attendance-code" value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Paste the live GDG KU event code" /><button type="submit">Check in</button></div></form>
    </section>
  );
}
