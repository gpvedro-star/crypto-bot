import Image from "next/image";
import type { AITool } from "@/content/types";

/** Tool logo container: uses the official asset when supplied, otherwise a typographic monogram. */
export function ToolMonogram({ tool, size = 48, logoSrc }: { tool: AITool; size?: number; logoSrc?: string }) {
  if (logoSrc) {
    return <Image src={logoSrc} alt={`${tool.name} logo`} width={size} height={size} className="rounded-[8px]" />;
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-[10px] bg-navy-900 font-serif font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {tool.monogram}
    </span>
  );
}
