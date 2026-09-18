"use client";

import Link from "next/link";
import { useEffect } from "react";
import { primaryNav } from "@/content/site";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  isActive: (href: string) => boolean;
}

export function MobileNav({ open, onClose, isActive }: MobileNavProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <div
      id="mobile-nav"
      className={`fixed inset-x-0 top-[var(--header-height)] bottom-0 z-30 bg-paper transition-[opacity,visibility] duration-200 lg:hidden ${
        open ? "visible opacity-100" : "invisible opacity-0"
      }`}
      aria-hidden={!open}
    >
      <nav aria-label="Mobile" className="container-x flex h-full flex-col overflow-y-auto pb-10 pt-4">
        <ul className="divide-y divide-line border-b border-line">
          {primaryNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex min-h-[60px] items-center justify-between font-serif text-[1.6rem] font-semibold text-navy-900 ${isActive(item.href) ? "" : ""}`}
                tabIndex={open ? 0 : -1}
              >
                {item.label}
                <span aria-hidden="true" className="text-sky-500">→</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/newsletter"
            tabIndex={open ? 0 : -1}
            className="inline-flex min-h-[52px] items-center justify-center rounded-[4px] bg-navy-900 font-sans text-[1rem] font-semibold text-white"
          >
            Join the NUVORA newsletter
          </Link>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 font-sans text-[0.95rem] text-ink-700">
            <Link href="/about" tabIndex={open ? 0 : -1} className="min-h-[44px] py-2">About NUVORA</Link>
            <Link href="/editorial-standards" tabIndex={open ? 0 : -1} className="min-h-[44px] py-2">Editorial Standards</Link>
            <Link href="/contact" tabIndex={open ? 0 : -1} className="min-h-[44px] py-2">Contact</Link>
            <Link href="/search" tabIndex={open ? 0 : -1} className="min-h-[44px] py-2">Search</Link>
          </div>
        </div>
        <p className="mt-auto pt-10 font-sans text-[0.85rem] text-ink-500">NUVORA · AI for Normal People.</p>
      </nav>
    </div>
  );
}
