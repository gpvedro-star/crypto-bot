"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { primaryNav } from "@/content/site";
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
        className={`sticky top-0 z-40 border-b bg-white/90 backdrop-blur-md transition-[box-shadow,border-color] duration-300 ${
          scrolled ? "border-line shadow-[0_8px_30px_-18px_rgba(11,45,91,0.35)]" : "border-line/60"
        }`}
      >
        <div className="container-x flex h-[var(--header-height)] items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-navy-900 hover:bg-mist lg:hidden"
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
          </div>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`inline-flex min-h-[40px] items-center rounded-full px-3.5 font-sans text-[0.93rem] font-medium transition-colors ${
                      isActive(item.href) ? "bg-navy-900 text-white" : "text-ink-700 hover:bg-mist hover:text-navy-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-navy-900 transition-colors hover:bg-mist"
              aria-label="Search NUVORA"
            >
              <SearchIcon />
            </button>
            <Link
              href="/newsletter"
              className="hidden min-h-[42px] items-center rounded-full bg-navy-900 px-5 font-sans text-[0.9rem] font-semibold text-white transition-colors hover:bg-navy-800 sm:inline-flex"
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
