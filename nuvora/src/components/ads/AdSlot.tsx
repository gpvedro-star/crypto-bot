import { adSlots, type AdSlotName } from "@/lib/monetization";

/**
 * Named advertising placeholder. Renders nothing until the slot is enabled
 * in lib/monetization.ts, at which point it reserves stable space and is
 * clearly labelled. Ad-serving code plugs in here, nowhere else.
 */
export function AdSlot({ name, className = "" }: { name: AdSlotName; className?: string }) {
  const slot = adSlots[name];
  if (!slot.enabled) return null;
  return (
    <aside
      aria-label={slot.label}
      data-ad-slot={name}
      className={`flex w-full items-center justify-center border-y border-line bg-mist font-sans text-[0.75rem] uppercase tracking-[0.14em] text-ink-400 ${className}`}
      style={{ minHeight: slot.minHeight }}
    >
      {slot.label}
    </aside>
  );
}
