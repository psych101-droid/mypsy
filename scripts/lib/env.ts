import fs from "node:fs";
import path from "node:path";

/** Minimal .env.local / .env loader so scripts run without extra deps. */
export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) continue;
    for (const line of fs.readFileSync(fullPath, "utf-8").split("\n")) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = raw.replace(/^["']|["']$/g, "");
    }
  }
}

export function requireEnv(keys: string[]) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        `Copy .env.example to .env.local and fill them in.`
    );
    process.exit(1);
  }
}
