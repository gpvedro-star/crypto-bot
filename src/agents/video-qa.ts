import fs from "node:fs";
import type { VideoQAReport } from "../core/types";

/** Hook for future visual/AI analysis of actual frames (e.g. extract N frames, send to a vision model). Not implemented yet. */
export interface FrameAnalyzer {
  analyze(file: string): Promise<{ status: "not_implemented" | "completed" | "failed"; findings?: string[] }>;
}
export const noopFrameAnalyzer: FrameAnalyzer = { analyze: async () => ({ status: "not_implemented" }) };

export interface Mp4Info { brand?: string; durationSeconds?: number; width?: number; height?: number; codec?: string }

const WEB_BRANDS = new Set(["isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "M4V ", "dash", "msnv"]);
const CODECS = ["avc1", "avc3", "hvc1", "hev1", "vp09", "av01"];

/** Minimal ISO-BMFF reader: ftyp brand, mvhd duration, tkhd dimensions, video codec fourcc. No external dependency. */
export function parseMp4(file: string): Mp4Info {
  const fd = fs.openSync(file, "r");
  try {
    const size = fs.fstatSync(fd).size;
    const info: Mp4Info = {};
    let pos = 0;
    while (pos + 8 <= size) {
      const h = Buffer.alloc(16);
      fs.readSync(fd, h, 0, 16, pos);
      let boxSize = h.readUInt32BE(0);
      const type = h.toString("ascii", 4, 8);
      let header = 8;
      if (boxSize === 1) { boxSize = Number(h.readBigUInt64BE(8)); header = 16; }
      else if (boxSize === 0) boxSize = size - pos;
      if (boxSize < header || pos + boxSize > size + 1) break;
      if (type === "ftyp") info.brand = h.toString("ascii", 8, 12);
      if (type === "moov") {
        const moov = Buffer.alloc(Math.min(boxSize - header, 32 * 1024 * 1024));
        fs.readSync(fd, moov, 0, moov.length, pos + header);
        readMoov(moov, info);
      }
      pos += boxSize;
    }
    return info;
  } finally { fs.closeSync(fd); }
}

function readMoov(buf: Buffer, info: Mp4Info) {
  const walk = (start: number, end: number, path: string[]) => {
    let p = start;
    while (p + 8 <= end) {
      const sz = buf.readUInt32BE(p);
      const type = buf.toString("ascii", p + 4, p + 8);
      if (sz < 8 || p + sz > end) break;
      const body = p + 8;
      if (type === "mvhd") {
        const v = buf[body];
        const timescale = v === 1 ? buf.readUInt32BE(body + 20) : buf.readUInt32BE(body + 12);
        const duration = v === 1 ? Number(buf.readBigUInt64BE(body + 24)) : buf.readUInt32BE(body + 16);
        if (timescale) info.durationSeconds = Math.round((duration / timescale) * 100) / 100;
      } else if (type === "tkhd") {
        const w = buf.readUInt32BE(p + sz - 8) / 65536, hgt = buf.readUInt32BE(p + sz - 4) / 65536;
        if (w > 0 && hgt > 0 && !info.width) { info.width = Math.round(w); info.height = Math.round(hgt); }
      } else if (type === "stsd") {
        const s = buf.toString("latin1", body, p + sz);
        info.codec ??= CODECS.find((c) => s.includes(c));
      } else if (["trak", "mdia", "minf", "stbl"].includes(type)) {
        walk(body, p + sz, [...path, type]);
      }
      p += sz;
    }
  };
  walk(0, buf.length, []);
}

export interface VideoQAOptions { minSeconds?: number; maxSeconds?: number; minWidth?: number; maxBytes?: number; frames?: FrameAnalyzer }

/** Automated Video QA. Frame-level visual analysis is a reserved extension point (see FrameAnalyzer). */
export async function inspectVideo(file: string, opts: VideoQAOptions = {}): Promise<VideoQAReport> {
  const { minSeconds = 3, maxSeconds = 30, minWidth = 1280, maxBytes = Number(process.env.VIDEO_MAX_MB ?? 25) * 1048576 } = opts;
  const checks: VideoQAReport["checks"] = [];
  const add = (name: string, passed: boolean, detail?: string) => checks.push({ name, passed, detail });
  const info: VideoQAReport["info"] = {};
  const frameAnalysis = await (opts.frames ?? noopFrameAnalyzer).analyze(file).catch((e) => ({ status: "failed" as const, findings: [(e as Error).message] }));

  if (!fs.existsSync(file)) {
    add("File exists and can be read", false, `${file} not found`);
    return { passed: false, checks, info, frameAnalysis };
  }
  const bytes = fs.statSync(file).size;
  info.bytes = bytes;
  add("File exists and can be read", bytes > 0, `${(bytes / 1048576).toFixed(2)} MB`);
  add(`File size ≤ ${(maxBytes / 1048576).toFixed(0)} MB`, bytes > 0 && bytes <= maxBytes, `${(bytes / 1048576).toFixed(2)} MB`);
  let mp4: Mp4Info = {};
  try { mp4 = parseMp4(file); } catch (e) { add("Container can be parsed", false, (e as Error).message); }
  info.brand = mp4.brand; info.durationSeconds = mp4.durationSeconds; info.width = mp4.width; info.height = mp4.height; info.format = mp4.codec ? `mp4/${mp4.codec}` : mp4.brand ? "mp4" : undefined;
  add("Format is MP4 (ISO-BMFF)", !!mp4.brand && WEB_BRANDS.has(mp4.brand), `brand ${mp4.brand ?? "none"}`);
  add("Codec is web-compatible (H.264/VP9/AV1)", !!mp4.codec && !["hvc1", "hev1"].includes(mp4.codec), `codec ${mp4.codec ?? "unknown"}`);
  add(`Duration ${minSeconds}–${maxSeconds}s`, mp4.durationSeconds !== undefined && mp4.durationSeconds >= minSeconds && mp4.durationSeconds <= maxSeconds, `${mp4.durationSeconds ?? "unknown"}s`);
  add(`Resolution ≥ ${minWidth}px wide`, (mp4.width ?? 0) >= minWidth, `${mp4.width ?? "?"}x${mp4.height ?? "?"}`);
  return { passed: checks.every((c) => c.passed), checks, info, frameAnalysis };
}
