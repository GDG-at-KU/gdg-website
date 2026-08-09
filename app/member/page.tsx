import { AttendanceScanner } from "../components/AttendanceScanner";
import { SectionMenu } from "../components/SectionMenu";
import styles from "./member.module.css";

export default function MemberPage() {
  return <main className={styles.memberPage}>
    <nav className={styles.memberNav}><a href="/" className={styles.brand}>GDG <span /> <em>ON CAMPUS<br />KU</em></a><SectionMenu /></nav>
    <section className={styles.hero}>
      <div><p className={styles.eyebrow}>YOUR GDG KU PASS</p><h1>Carry the<br /><i>community.</i></h1><p className={styles.intro}>A mobile-first home for events, attendance, learning streaks, and the people building alongside you.</p></div>
      <div className={styles.pass} aria-label="Preview of a GDG on Campus KU member pass"><div className={styles.passTop}><span>GOOGLE DEVELOPER GROUPS</span><b>KU</b></div><div><strong>GDG</strong><p>ON CAMPUS ? UNIVERSITY OF KANSAS</p></div><div className={styles.passBottom}><span>MEMBER PASS</span><span>2026</span></div></div>
    </section>
    <section className={styles.stats} aria-label="Member activity"><article><span>01</span><b>Upcoming</b><strong>Build Night</strong><p>Sep 05 ? 6:00 PM</p></article><article><span>02</span><b>Attendance</b><strong>0 check-ins</strong><p>Connect KU sign-in to begin</p></article><article><span>03</span><b>Next release</b><strong>Buddy match</strong><p>Find a LeetCode partner</p></article></section>
    <AttendanceScanner />
    <section className={styles.roadmap}><p className={styles.eyebrow}>WHAT'S NEXT</p><h2>One pass.<br /><i>More momentum.</i></h2><div><article><span>01</span><h3>KU sign-in</h3><p>Use your university account to securely save your profile and attendance.</p></article><article><span>02</span><h3>Event history</h3><p>See your check-ins, points, and upcoming events in one place.</p></article><article><span>03</span><h3>Builder buddies</h3><p>Match with students for LeetCode, projects, and study sessions.</p></article></div></section>
  </main>;
}
