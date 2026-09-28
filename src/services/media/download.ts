import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export class DownloadError extends Error {
  constructor(message: string) { super(`[download] ${message}`); this.name = "DownloadError"; }
}

export interface DownloadOptions {
  timeoutMs?: number;
  maxBytes?: number;
  retries?: number;
  /** Extra header for hosts that require it (none needed for Pexels' public CDN). */
  headers?: Record<string, string>;
  /** Reject the file unless its content-type starts with one of these. */
  expectTypes?: string[];
}

export interface Downloaded { path: string; bytes: number; contentType: string }

/** Streams a URL to disk with a size cap, timeout and retries. Throws DownloadError with the exact cause; never leaves partial files. */
export async function downloadFile(url: string, dest: string, opts: DownloadOptions = {}): Promise<Downloaded> {
  const { timeoutMs = 60000, maxBytes = 50 * 1024 * 1024, retries = 2 } = opts;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let lastError = "";
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const tmp = `${dest}.part`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: opts.headers });
      if (!res.ok || !res.body) throw new DownloadError(`HTTP ${res.status} for ${url}`);
      const contentType = res.headers.get("content-type") ?? "";
      if (opts.expectTypes && !opts.expectTypes.some((t) => contentType.startsWith(t))) throw new DownloadError(`unexpected content-type "${contentType}" for ${url} (expected ${opts.expectTypes.join("|")})`);
      const declared = Number(res.headers.get("content-length") ?? 0);
      if (declared && declared > maxBytes) throw new DownloadError(`file is ${(declared / 1048576).toFixed(1)} MB, above the ${(maxBytes / 1048576).toFixed(0)} MB cap`);
      let bytes = 0;
      const limiter = async function* (src: AsyncIterable<Uint8Array>) {
        for await (const chunk of src) {
          bytes += chunk.length;
          if (bytes > maxBytes) throw new DownloadError(`download exceeded the ${(maxBytes / 1048576).toFixed(0)} MB cap`);
          yield chunk;
        }
      };
      await pipeline(Readable.fromWeb(res.body as never), limiter, fs.createWriteStream(tmp));
      if (bytes === 0) throw new DownloadError(`empty response for ${url}`);
      fs.renameSync(tmp, dest);
      return { path: dest, bytes, contentType };
    } catch (e) {
      fs.rmSync(tmp, { force: true });
      lastError = e instanceof DownloadError ? e.message : `[download] ${(e as Error).name === "TimeoutError" ? `timed out after ${timeoutMs}ms` : (e as Error).message} (${url})`;
      if (e instanceof DownloadError && /HTTP 4\d\d/.test(e.message)) break; // client errors will not fix themselves
    }
  }
  throw new DownloadError(lastError.replace(/^\[download\] /, ""));
}

/** Detects the image format from magic bytes and reads pixel dimensions (JPEG/PNG). Returns undefined if not a valid image. */
export function inspectImage(file: string): { format: "jpeg" | "png"; width: number; height: number } | undefined {
  const fd = fs.openSync(file, "r");
  try {
    const head = Buffer.alloc(32);
    fs.readSync(fd, head, 0, 32, 0);
    if (head[0] === 0x89 && head.toString("ascii", 1, 4) === "PNG") return { format: "png", width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
    if (head[0] === 0xff && head[1] === 0xd8) {
      const size = fs.fstatSync(fd).size;
      const buf = Buffer.alloc(Math.min(size, 256 * 1024));
      fs.readSync(fd, buf, 0, buf.length, 0);
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { format: "jpeg", height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
    return undefined;
  } finally { fs.closeSync(fd); }
}
