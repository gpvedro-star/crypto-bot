"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { primaryNav, site } from "@/content/site";
import { Logo } from "@/components/brand/Logo";
import { SearchDialog } from "./SearchDialog";
import { MobileNav } from "./MobileNav";

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes (adjusting state during render).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-t-[3px] border-b border-t-navy-900 bg-white transition-[box-shadow,border-bottom-color] duration-300 ${
          scrolled ? "border-b-line shadow-[0_8px_30px_-22px_rgba(11,45,91,0.45)]" : "border-b-line/70"
        }`}
      >
        <div className="container-x flex h-[var(--header-height)] items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-[3px] text-navy-900 hover:bg-mist lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
            <Link href="/" className="flex items-center text-navy-900" aria-label="NUVORA home">
              <Logo variant="wordmark" height={30} className="hidden sm:block" />
              <Logo variant="wordmark" height={26} className="sm:hidden" />
            </Link>
            {/* Publication slogan: secondary to the wordmark, and only where
                there is room for it beside the nav. Below xl the hero carries it. */}
            <span className="hidden items-center gap-3 xl:flex">
              <span aria-hidden="true" className="h-6 w-px bg-line-strong" />
              <span className="eyebrow text-ink-400">{site.tagline}</span>
            </span>
          </div>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center">
              {primaryNav.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`relative inline-flex h-[var(--header-height)] items-center px-3 font-sans text-[0.95rem] font-medium transition-colors ${
                        active ? "text-navy-900" : "text-ink-700 hover:text-navy-900"
                      }`}
                    >
                      {item.label}
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-3 bottom-0 h-[2px] bg-navy-900 transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[3px] text-navy-900 transition-colors hover:bg-mist"
              aria-label="Search NUVORA"
            >
              <SearchIcon />
            </button>
            <Link
              href="/newsletter"
              className="hidden min-h-[40px] items-center rounded-[3px] bg-navy-900 px-5 font-sans text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-navy-800 sm:inline-flex"
            >
              Subscribe
            </Link>
          </div>
        </div>
      </header>
      {/* Rendered outside <header>: its backdrop-filter would otherwise trap this fixed panel. */}
      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} isActive={isActive} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
