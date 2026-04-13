import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const TOKENISH_KEYS = new Set(["API_KEY_PORTFOLIO", "GITHUB_TOKEN", "GH_TOKEN"]);
export function loadEnv() {
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    const envPath = path.join(root, ".env");
    if (!fs.existsSync(envPath))
        return;
    let text = fs.readFileSync(envPath, "utf8");
    text = text.replace(/^\uFEFF/, "");
    for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#"))
            continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1)
            continue;
        let key = trimmed.slice(0, eq).trim();
        if (key.toLowerCase().startsWith("export "))
            key = key.slice(7).trim();
        let val = trimmed.slice(eq + 1).trim();
        const quoted = (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"));
        if (quoted) {
            val = val.slice(1, -1);
        }
        else {
            val = val.replace(/\s+#.*$/, "").trim();
        }
        if (!key)
            continue;
        const current = process.env[key];
        const currentEmpty = current === undefined || String(current).trim() === "";
        const preferFile = TOKENISH_KEYS.has(key) && val !== "" && currentEmpty;
        if (preferFile || current === undefined) {
            process.env[key] = val;
        }
    }
}
