import Link from "next/link";
import { SectionMenu } from "./SectionMenu";

const copy: Record<string, string> = {
  "What is GDG on Campus?": "GDG on Campus KU is a student-led place to explore Google technologies, work on real ideas, and grow alongside curious people.",
  "Our community values": "We make room for beginners, celebrate generous collaboration, and choose progress over perfection. Every question is welcome.",
  "Why join us": "Find practical workshops, friendly peers, creative challenges, and opportunities to build a portfolio you are proud to share.",
  "Join Discord": "Join the GDG on Campus KU Discord for launch updates, upcoming sessions, conversations, and a direct way to meet other builders.",
  "Follow on LinkedIn": "Follow our LinkedIn page for event announcements, community updates, and highlights from the people building GDG KU.",
  "Contact GDG KU": "Have a question, collaboration idea, or want to get involved? Send the GDG KU team an email.",
};

const destinations: Record<string, { href: string; label: string }> = {
  "Join Discord": { href: "https://discord.gg/BmKfZUnaQ", label: "Open Discord" },
  "Follow on LinkedIn": { href: "https://www.linkedin.com/company/gdg-at-ku/posts/?feedView=all", label: "Open LinkedIn" },
  "Contact GDG KU": { href: "mailto:gdgatku@gmail.com", label: "Email GDG KU" },
};

export function SectionPage({ number, eyebrow, title, text, items }: { number: string; eyebrow: string; title: string; text: string; items: string[] }) {
  return <main className="inner-page">
    <header className="inner-nav shell site-header"><Link className="brand" href="/"><span>GDG</span><i /> <em>on Campus<br />KU</em></Link><SectionMenu /></header>
    <section className="inner-hero shell"><p className="eyebrow"><span /> {number} . {eyebrow}</p><h1>{title}</h1><p>{text}</p></section>
    <section className="inner-list shell">{items.map((item, index) => <article key={item}><details><summary><span>0{index + 1}</span><h2>{item}</h2><b>+</b></summary><div className="accordion-copy"><p>{copy[item] || `Explore ${item.toLowerCase()} with GDG on Campus KU. More details will be announced soon.`}</p>{destinations[item] && <a href={destinations[item].href} target={destinations[item].href.startsWith("http") ? "_blank" : undefined} rel={destinations[item].href.startsWith("http") ? "noreferrer" : undefined}>{destinations[item].label} ↗</a>}</div></details></article>)}</section>
  </main>;
}
