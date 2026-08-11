"use client";

import { useEffect, useRef } from "react";
import { CampusMarquee } from "./components/CampusMarquee";
import { SectionMenu } from "./components/SectionMenu";

const events = [
  { date: "SEP 05", type: "BUILD NIGHT", title: "From idea to first deploy", place: "KU Campus · 6:00 PM", tone: "blue" },
  { date: "SEP 19", type: "TECH TALK", title: "The AI tools students actually use", place: "Online + KU Campus · 5:30 PM", tone: "crimson" },
  { date: "OCT 03", type: "HACK DAY", title: "Make something Kansas needs", place: "KU Campus · All day", tone: "yellow" },
];

const tracks = ["AI & ML", "Web", "Cloud", "Android", "Flutter", "Career"];

export default function Home() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    let ctx: { revert: () => void } | undefined;
    void import("gsap").then(({ gsap }) => {
      ctx = gsap.context(() => {
        gsap.fromTo(".reveal", { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.11, ease: "power3.out", delay: 0.08 });
        gsap.to(".scroll-line", { scaleY: 1, duration: 1.4, ease: "power2.inOut", repeat: -1, yoyo: true });
      }, root);
    });
    return () => ctx?.revert();
  }, []);

  return (
    <main ref={root}>
      <section className="hero" id="top">
        <nav className="nav shell" aria-label="Main navigation">
          <a className="brand" href="#top" aria-label="GDG on Campus KU home"><span>GDG</span><i /> <em>on Campus<br />KU</em></a>
          <div className="nav-links"><a href="/about">About</a><a href="/calendar">Calendar</a><a href="/members">Members</a><a href="/team">Team</a></div>
          <SectionMenu />
        </nav>

        <div className="hero-grid shell">
          <div className="hero-copy">
            <p className="eyebrow reveal"><span /> UNIVERSITY OF KANSAS · LAWRENCE</p>
            <h1 className="reveal">Build what’s<br /><i>next, together.</i></h1>
            <p className="hero-text reveal">A student-led community for curious builders. Learn new technology, meet your people, and create work that matters.</p>
            <div className="hero-actions reveal"><a className="button primary" href="#join">Join the community <b>↗</b></a><a className="text-link" href="#events">Explore events <b>↓</b></a></div>
          </div>
          <div className="hero-art reveal"><CampusMarquee /><p className="orbit-label">GDG × KU<br />IN MOTION</p><div className="star one">✦</div><div className="star two">✦</div><div className="hero-mark">EST.<br />2026</div></div>
        </div>
        <div className="hero-footer shell"><p>Google Developer Groups on Campus</p><div className="scroll-cue"><span className="scroll-line" />SCROLL TO EXPLORE</div><p>Jayhawk-built. Future-facing.</p></div>
      </section>

      <section className="statement section shell" id="about">
        <div className="section-index">01 / OUR COMMUNITY</div>
        <div className="statement-copy"><p className="kicker">MORE THAN A CLUB</p><h2>Come for the code.<br /><i>Stay for the people.</i></h2><p>GDG on Campus KU brings students across majors together to explore technology through hands-on learning, creative experiments, and generous collaboration.</p><a className="text-link dark" href="#join">Get to know GDG <b>↗</b></a></div>
        <div className="moon-card"><p>THE<br />BUILDER’S<br />PHASES</p><div className="moons"><i /><i /><i /><i /><i /></div><small>DISCOVER · MAKE · SHARE · REPEAT</small></div>
      </section>

      <section className="events section" id="events">
          <div className="shell"><div className="heading-row"><div><p className="kicker">ON THE CALENDAR</p><h2>Make plans<br /><i>to make things.</i></h2></div><a className="button outline" href="/calendar">See all events <b>↗</b></a></div>
          <div className="event-list">{events.map((event) => <article className={`event-card ${event.tone}`} key={event.date}><div className="event-date">{event.date}</div><div className="event-info"><p>{event.type}</p><h3>{event.title}</h3><span>{event.place}</span></div><a href="#join" aria-label={`RSVP for ${event.title}`}>RSVP <b>↗</b></a></article>)}</div>
        </div>
      </section>

      <section className="tracks section shell" id="tracks"><div className="tracks-intro"><p className="kicker">FIND YOUR THREAD</p><h2>A place for every<br /><i>kind of builder.</i></h2></div><div className="track-grid">{tracks.map((track, index) => <div className="track" key={track}><span>0{index + 1}</span><b>{track}</b><i>{index % 2 ? "↗" : "✦"}</i></div>)}</div></section>

      <section className="team section" id="team"><div className="shell team-layout"><div><p className="kicker">THE PEOPLE BEHIND IT</p><h2>Powered by<br /><i>students like you.</i></h2><p className="team-copy">We’re organizers, designers, developers, and first-time builders making room for the next person to start.</p></div><div className="team-note"><div className="sunflower">✺</div><p>Want to shape this community?</p><a className="button crimson" href="#join">Meet the team <b>↗</b></a></div></div></section>

      <section className="join" id="join"><div className="join-grid"><div className="join-copy"><p className="kicker">YOUR INVITATION</p><h2>The next great<br /><i>thing starts here.</i></h2><p>No experience required. Bring your curiosity and we’ll bring the community.</p></div><div className="join-actions"><a className="join-link discord" href="https://discord.com" target="_blank" rel="noreferrer"><span>01</span><b>Join Discord</b><i>↗</i></a><a className="join-link linkedin" href="https://linkedin.com" target="_blank" rel="noreferrer"><span>02</span><b>Follow on LinkedIn</b><i>↗</i></a><a className="join-link email" href="mailto:gdg@ku.edu"><span>03</span><b>Say hello</b><i>↗</i></a></div></div></section>

      <footer className="footer shell"><a className="brand" href="#top"><span>GDG</span><i /> <em>on Campus<br />KU</em></a><p>© 2026 GDG on Campus KU</p><p>Built at the University of Kansas</p></footer>
    </main>
  );
}
