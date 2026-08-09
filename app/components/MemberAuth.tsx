"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { isSignInWithEmailLink, onAuthStateChanged, sendSignInLinkToEmail, signInWithEmailLink, signOut } from "firebase/auth";
import { firebaseConfigured, memberAuth, persistMemberSession } from "../lib/firebase";

const EMAIL_KEY = "gdg-ku-email-link";
const TEST_EMAIL_DOMAIN = "@gmail.com";
export type GdgMember = { uid: string; email: string };

type Props = { children: (member: GdgMember) => ReactNode };

export function MemberAuth({ children }: Props) {
  const [member, setMember] = useState<GdgMember | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isEmailLink, setIsEmailLink] = useState(false);

  useEffect(() => {
    if (!memberAuth) { setLoading(false); return; }
    void persistMemberSession();
    setIsEmailLink(isSignInWithEmailLink(memberAuth, window.location.href));
    const unsubscribe = onAuthStateChanged(memberAuth, (user) => {
      const verifiedEmail = user?.email?.toLowerCase();
      setMember(user && verifiedEmail?.endsWith(TEST_EMAIL_DOMAIN) ? { uid: user.uid, email: verifiedEmail } : null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberAuth) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith(TEST_EMAIL_DOMAIN)) { setMessage("For this test, use a Gmail address ending in @gmail.com."); return; }
    try {
      setMessage("");
      await persistMemberSession();
      if (isEmailLink) {
        await signInWithEmailLink(memberAuth, normalizedEmail, window.location.href);
        window.localStorage.removeItem(EMAIL_KEY);
        window.history.replaceState({}, document.title, "/member");
        setMessage("Your Gmail address is verified. Welcome to GDG KU.");
        return;
      }
      await sendSignInLinkToEmail(memberAuth, normalizedEmail, { url: `${window.location.origin}/member`, handleCodeInApp: true });
      window.localStorage.setItem(EMAIL_KEY, normalizedEmail);
      setMessage("Check your Gmail inbox and open the sign-in link on this device.");
    } catch {
      setMessage("We could not send or confirm that link. Make sure Email Link is enabled in Firebase and this website domain is authorized.");
    }
  }

  async function logOut() {
    if (memberAuth) await signOut(memberAuth);
  }

  if (loading) return <main className={"member-page"}><div className={"member-auth-loading"}>Loading your member pass...</div></main>;
  if (member) return <>{children(member)}</>;

  return <main className={"member-page"}>
    <section className={"member-auth-shell"}>
      <a href="/" className={"member-brand"}>GDG <span /> <em>ON CAMPUS<br />KU</em></a>
      <div className={"member-auth-card"}>
        <p className={"member-eyebrow"}>GDG KU MEMBER PASS · GMAIL TEST</p>
        <h1>{isEmailLink ? "Confirm your\nKU email." : "Your pass\nstarts here."}</h1>
        <p>Use a Gmail address once to test the member pass. After you verify it, this PWA remembers the pass on this phone.</p>
        {!firebaseConfigured && <p className={"member-auth-warning"}>Firebase is not configured on this device yet.</p>}
        <form onSubmit={submitEmail}><label htmlFor="member-email">Gmail address</label><input id="member-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@gmail.com" required /><button type="submit" disabled={!firebaseConfigured}>{isEmailLink ? "Verify email" : "Send sign-in link"}</button></form>
        {message && <p className={"member-auth-message"}>{message}</p>}
        <small>No passwords. Gmail is enabled temporarily to test Firebase email delivery before KU-only access is restored.</small>
      </div>
    </section>
  </main>;
}

export function MemberSignOut() {
  return <button className={"member-sign-out"} onClick={() => { if (memberAuth) void signOut(memberAuth); }}>Sign out</button>;
}
