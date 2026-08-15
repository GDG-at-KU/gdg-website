"use client";

import { useState } from "react";

const months = ["September 2026", "October 2026", "November 2026"];

export function GdgCalendar() {
  const [month, setMonth] = useState(0);
  const start = [2, 4, 0][month];
  const days = [30, 31, 30][month];
  const cells = Array.from({ length: start + days }, (_, index) => (index < start ? 0 : index - start + 1));

  return <section className="calendar-shell">
    <div className="calendar-title">
      <div><p className="eyebrow"><span /> EVENT CALENDAR</p><h1>Something good<br /><i>is loading.</i></h1></div>
      <div className="calendar-controls"><button onClick={() => setMonth(Math.max(0, month - 1))} disabled={!month} aria-label="Previous month">←</button><b>{months[month]}</b><button onClick={() => setMonth(Math.min(2, month + 1))} disabled={month === 2} aria-label="Next month">→</button></div>
    </div>
    <div className="calendar-layout">
      <div className="calendar-grid"><div className="weekdays">{["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => <span key={day}>{day}</span>)}</div><div className="days">{cells.map((day, index) => <div key={`${month}-${index}`} className="calendar-empty-day"><b>{day || ""}</b></div>)}</div></div>
      <aside className="calendar-detail"><p>EVENTS ARE COMING</p><h2>No confirmed dates yet.</h2><span>Our first workshops, build nights, and community sessions are currently taking shape.</span><hr /><p>Join the Discord to hear about each event as soon as it is announced.</p><a href="https://discord.gg/BmKfZUnaQ" target="_blank" rel="noreferrer">Get Discord updates ↗</a></aside>
    </div>
  </section>;
}
