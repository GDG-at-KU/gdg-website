"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { GdgMember } from "./MemberAuth";
import { saveAttendance } from "../lib/memberData";

type ScannerControls = { stop: () => void };

export function AttendanceScanner({ member }: { member: GdgMember }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  const stopScan = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setIsScanning(false);
  };

  useEffect(() => () => controlsRef.current?.stop(), []);

  async function recordCheckIn(rawCode: string) {
    try {
      setError(null);
      const eventCode = await saveAttendance(member.uid, rawCode);
      setResult(eventCode);
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
      <form className={"member-manual-form"} onSubmit={submitManual}><label htmlFor="attendance-code">Camera not working?</label><div><input id="attendance-code" value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Paste the live GDG KU event code" /><button type="submit">Check in</button></div></form>
    </section>
  );
}
