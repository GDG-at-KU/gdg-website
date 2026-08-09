"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import styles from "../member/member.module.css";

type ScannerControls = { stop: () => void };

export function AttendanceScanner() {
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
          setResult(scanResult.getText());
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
    setResult(code);
    setManualCode("");
  }

  return (
    <section className={styles.scanner} aria-labelledby="attendance-title">
      <div className={styles.scannerHead}>
        <div><p className={styles.eyebrow}>MEMBER CHECK-IN</p><h2 id="attendance-title">Scan in.<br /><i>Show up.</i></h2></div>
        <span className={styles.liveDot}>LIVE CAMERA</span>
      </div>
      <div className={styles.cameraFrame}>
        <video ref={videoRef} className={styles.video} muted playsInline autoPlay aria-label="Camera preview for scanning an event QR code" />
        {!isScanning && !result && <div className={styles.cameraPlaceholder}><b>QR</b><span>Ready when you are</span></div>}
        {isScanning && <div className={styles.scanGuide} aria-hidden="true" />}
      </div>
      <div className={styles.scannerActions}>
        {!isScanning ? <button className={styles.scanButton} onClick={startScan}>Open camera <b>?</b></button> : <button className={styles.stopButton} onClick={stopScan}>Stop camera</button>}
        <p>Use the QR code displayed by the event host. Your camera stays on this device.</p>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {result && <div className={styles.scanResult}><span>CODE CAPTURED</span><b>{result}</b><p>This scan is ready for server verification once KU sign-in is connected.</p></div>}
      <form className={styles.manualForm} onSubmit={submitManual}><label htmlFor="attendance-code">Have a short event code instead?</label><div><input id="attendance-code" value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="e.g. BUILD-NIGHT-01" /><button type="submit">Check in</button></div></form>
    </section>
  );
}
