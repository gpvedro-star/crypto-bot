"use client";
import { useEffect, useState } from "react";
import type { Link } from "../lib/types";

export interface NavbarProps { brand: string; logoUrl?: string; links: Link[]; cta: Link }

export function Navbar({ brand, logoUrl, links, cta }: NavbarProps) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const hero = document.getElementById("hero");
    let io: IntersectionObserver | undefined;
    if (hero && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting), { threshold: 0.05 });
      io.observe(hero);
    }
    return () => { window.removeEventListener("scroll", onScroll); io?.disconnect(); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className={`nav ${solid || open ? "is-solid" : ""}`}>
        <div className="container nav-inner">
          <a className="brand" href="#top" aria-label={`${brand}, back to top`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logoUrl ? <img src={logoUrl} alt="" className="brand-logo" height={36} /> : null}
            <span>{brand}</span>
          </a>
          <nav id="primary-nav" aria-label="Primary" className={`nav-links ${open ? "is-open" : ""}`}>
            <ul>
              {links.map((l) => (
                <li key={l.href}><a href={l.href} onClick={() => setOpen(false)}>{l.label}</a></li>
              ))}
            </ul>
          </nav>
          <a className="btn btn-sm nav-cta" href={cta.href}>{cta.label}</a>
          <button className="nav-toggle" aria-expanded={open} aria-controls="primary-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)}>
            <span aria-hidden="true" className="nav-toggle-bars" />
          </button>
        </div>
      </header>
      <div className={`mobile-bar ${showBar ? "is-visible" : ""}`} aria-hidden={!showBar}>
        <a className="btn btn-block" href={cta.href} tabIndex={showBar ? 0 : -1}>{cta.label}</a>
      </div>
    </>
  );
}
