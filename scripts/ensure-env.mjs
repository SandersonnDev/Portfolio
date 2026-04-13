import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const examplePath = [path.join(root, ".env.example"), path.join(root, "env.exemple")].find((p) => fs.existsSync(p));
if (!fs.existsSync(envPath) && examplePath) {
    fs.copyFileSync(examplePath, envPath);
    console.info("[ensure-env] Fichier .env créé — renseigne GITHUB_TOKEN puis relance si besoin.");
}
