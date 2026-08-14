"use client";

import { ReactNode, useEffect, useState } from "react";
import { GoogleAuthProvider, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { firebaseConfigured, memberAuth, persistMemberSession } from "../lib/firebase";
import { SectionMenu } from "./SectionMenu";

const ALLOWED_EMAIL_DOMAINS = ["@gmail.com", "@ku.edu"];
export type GdgMember = { uid: string; email: string };

type Props = { children: (member: GdgMember) => ReactNode };

export function MemberAuth({ children }: Props) {
  const [member, setMember] = useState<GdgMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!memberAuth) { setLoading(false); return; }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function restoreGoogleSession() {
      await persistMemberSession();
      await getRedirectResult(memberAuth!).catch(() => {
        if (!cancelled) setMessage("Google sign-in could not be completed. Please try again.");
      });
      if (cancelled) return;
      unsubscribe = onAuthStateChanged(memberAuth!, (user) => {
        const verifiedEmail = user?.email?.toLowerCase();
        const canJoin = verifiedEmail && ALLOWED_EMAIL_DOMAINS.some((domain) => verifiedEmail.endsWith(domain));
        setMember(user && canJoin ? { uid: user.uid, email: verifiedEmail } : null);
        setLoading(false);
      });
    }

    void restoreGoogleSession();
    return () => { cancelled = true; unsubscribe?.(); };
  }, []);

  async function signInWithGoogle() {
    if (!memberAuth) return;
    try {
      setMessage("Opening Google sign-in...");
      await persistMemberSession();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      if (window.matchMedia("(pointer: coarse)").matches) {
        await signInWithRedirect(memberAuth, provider);
      } else {
        await signInWithPopup(memberAuth, provider);
      }
    } catch {
      setMessage("Google sign-in could not start. Make sure Google sign-in and this website domain are enabled in Firebase.");
    }
  }

  if (loading) return <main className="member-page"><div className="member-auth-loading">Loading your member pass...</div></main>;
  if (member) return <>{children(member)}</>;

  return <main className="member-page">
    <section className="member-auth-shell">
      <header className="member-auth-nav site-header"><a href="/" className="member-brand">GDG <span /> <em>ON CAMPUS<br />KU</em></a><SectionMenu /></header>
      <div className="member-auth-card">
        <p className="member-eyebrow">GDG KU MEMBER PASS · GOOGLE SIGN-IN</p>
        <h1>Your pass{"\n"}starts here.</h1>
        <p>Continue with Google once. After that, this PWA remembers your member pass on this phone.</p>
        {!firebaseConfigured && <p className="member-auth-warning">Firebase is not configured on this device yet.</p>}
        <button className="member-google-sign-in" type="button" onClick={() => void signInWithGoogle()} disabled={!firebaseConfigured}>
          <span className="member-google-mark" aria-hidden="true">G</span>
          <span className="member-google-copy"><small>MEMBER ACCESS</small><b>Continue with Google</b></span>
          <i aria-hidden="true">→</i>
        </button>
        {message && <p className="member-auth-message">{message}</p>}
        <small>No passwords or email links. Google confirms the account, then your member pass stays signed in on this device.</small>
      </div>
    </section>
  </main>;
}

export function MemberSignOut() {
  return <button className="member-sign-out" onClick={() => { if (memberAuth) void signOut(memberAuth); }}>Sign out</button>;
}
