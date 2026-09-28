import type { Link } from "../lib/types";

export interface FooterProps {
  brand: string; tagline: string; links: Link[];
  contact: { phone?: string; email?: string; address?: string };
  credits: { name: string; url: string }[];
}

export function Footer({ brand, tagline, links, contact, credits }: FooterProps) {
  return (
    <footer className="footer tone-dark">
      <div className="container footer-grid">
        <div>
          <p className="footer-brand display">{brand}</p>
          <p className="muted">{tagline}</p>
        </div>
        <nav aria-label="Footer"><ul>{links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul></nav>
        <ul className="footer-contact">
          {contact.phone && <li>{contact.phone}</li>}
          {contact.email && <li>{contact.email}</li>}
          {contact.address && <li>{contact.address}</li>}
        </ul>
      </div>
      <div className="container footer-legal">
        <p>© {new Date().getFullYear()} {brand}. All rights reserved.</p>
        {credits.length > 0 && (
          <p className="credit">Photography via <a href="https://www.pexels.com" rel="noopener noreferrer">Pexels</a>: {credits.map((c, i) => <span key={c.url}>{i > 0 && ", "}<a href={c.url} rel="noopener noreferrer">{c.name}</a></span>)}</p>
        )}
      </div>
    </footer>
  );
}
