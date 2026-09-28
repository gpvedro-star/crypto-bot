import path from "node:path";

/** Server-side only. Reads env lazily so tests can override process.env. */
export function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function projectsDir(): string {
  return path.resolve(env("STUDIO_PROJECTS_DIR") ?? path.join(process.cwd(), "projects"));
}
