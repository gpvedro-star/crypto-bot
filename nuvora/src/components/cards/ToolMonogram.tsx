import Image from "next/image";
import type { AITool } from "@/content/types";

const gradients = ["from-navy-900 to-navy-700", "from-navy-800 to-navy-600", "from-navy-700 to-sky-500", "from-navy-950 to-navy-800"];

/** Tool logo container: official asset when supplied, otherwise a typographic monogram. */
export function ToolMonogram({ tool, size = 48, logoSrc }: { tool: AITool; size?: number; logoSrc?: string }) {
  if (logoSrc) {
    return <Image src={logoSrc} alt={`${tool.name} logo`} width={size} height={size} className="rounded-[12px]" />;
  }
  const g = gradients[tool.name.length % gradients.length];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br ${g} font-sans font-bold text-white shadow-card`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {tool.monogram}
    </span>
  );
}
