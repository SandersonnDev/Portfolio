#!/usr/bin/env node
/**
 * Récupère les dépôts publics GitHub et génère src/data/github-projects.generated.json
 * Avec token : dépôts publics dont tu es propriétaire OU collaborateur (API /user/repos).
 * Sans token : uniquement les dépôts publics du compte GITHUB_USERNAME (limite API basse).
 * Carte : description GitHub | page détail : résumé README + stack = topics (sinon langages).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "src", "data", "github-projects.generated.json");

const USERNAME = (process.env.GITHUB_USERNAME || "SandersonnDev").trim();
/** Secret dépôt (API_KEY_PORTFOLIO) ou GITHUB_TOKEN / GH_TOKEN */
const TOKEN = (
	process.env.API_KEY_PORTFOLIO ||
	process.env.GITHUB_TOKEN ||
	process.env.GH_TOKEN ||
	""
).trim();

function ghHeaders() {
	const h = {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
	};
	if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
	return h;
}

function parseLinkNext(linkHeader) {
	if (!linkHeader) return null;
	for (const part of linkHeader.split(",")) {
		const m = part.match(/<([^>]+)>;\s*rel="next"/);
		if (m) return m[1];
	}
	return null;
}

async function ghFetch(url) {
	const res = await fetch(url, { headers: ghHeaders() });
	if (res.status === 403) {
		const t = await res.text();
		throw new Error(
			`GitHub 403 (limite API ? ajoute API_KEY_PORTFOLIO ou GITHUB_TOKEN dans .env, ou le secret en CI)\n${t.slice(0, 400)}`,
		);
	}
	if (!res.ok) {
		const t = await res.text();
		throw new Error(`GitHub ${res.status} ${url}\n${t.slice(0, 400)}`);
	}
	return res;
}

/** Dépôts publics du compte (sans auth) — uniquement ceux appartenant à ce user. */
async function fetchAllPublicReposForUser(owner) {
	const all = [];
	let url = `https://api.github.com/users/${encodeURIComponent(owner)}/repos?per_page=100&sort=created&direction=desc&type=owner`;
	while (url) {
		const res = await ghFetch(url);
		const batch = await res.json();
		if (!Array.isArray(batch)) throw new Error("Réponse repos inattendue");
		for (const r of batch) {
			if (r.private) continue;
			all.push(r);
		}
		url = parseLinkNext(res.headers.get("link"));
	}
	return all;
}

/**
 * Dépôts publics accessibles au compte authentifié : tes repos + ceux où tu es collaborateur.
 * @see https://docs.github.com/en/rest/repos/repos#list-repositories-for-the-authenticated-user
 */
async function fetchAllPublicReposAsAuthenticatedUser() {
	const all = [];
	let url =
		"https://api.github.com/user/repos?per_page=100&visibility=public&affiliation=owner,collaborator&sort=created&direction=desc";
	while (url) {
		const res = await ghFetch(url);
		const batch = await res.json();
		if (!Array.isArray(batch)) throw new Error("Réponse /user/repos inattendue");
		for (const r of batch) {
			if (r.private) continue;
			all.push(r);
		}
		url = parseLinkNext(res.headers.get("link"));
	}
	/* Même dépôt ne doit pas apparaître deux fois (pagination / edge cases) */
	const byId = new Map();
	for (const r of all) {
		if (r.id != null) byId.set(r.id, r);
	}
	return [...byId.values()];
}

async function fetchAllPublicReposForPortfolio() {
	if (TOKEN) {
		return fetchAllPublicReposAsAuthenticatedUser();
	}
	return fetchAllPublicReposForUser(USERNAME);
}

async function fetchTopics(owner, repo) {
	const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/topics`, {
		headers: {
			...ghHeaders(),
			Accept: "application/vnd.github+json",
		},
	});
	if (!res.ok) return [];
	const data = await res.json();
	return Array.isArray(data.names) ? data.names : [];
}

async function fetchLanguages(owner, repo) {
	const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`, {
		headers: ghHeaders(),
	});
	if (!res.ok) return [];
	const data = await res.json();
	return Object.entries(data)
		.sort((a, b) => b[1] - a[1])
		.map(([lang]) => lang)
		.slice(0, 8);
}

async function fetchReadmeRaw(owner, repo) {
	const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`, {
		headers: {
			...ghHeaders(),
			Accept: "application/vnd.github.raw",
		},
	});
	if (res.status === 404) return "";
	if (!res.ok) return "";
	return res.text();
}

function slugifyRepoName(name) {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function markdownToPlain(md) {
	if (!md) return "";
	let s = md.replace(/```[\s\S]*?```/g, " ");
	/* Retirer tableaux GFM (lignes | … |) et séparateurs --- */
	s = s
		.split("\n")
		.filter((line) => {
			const t = line.trim();
			if (t.startsWith("|") && t.endsWith("|")) return false;
			if (/^[-:| ]{3,}$/.test(t)) return false;
			return true;
		})
		.join("\n");
	s = s
		.replace(/`[^`]+`/g, " ")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/^#{1,6}\s+.*/gm, " ")
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/\*([^*]+)\*/g, "$1")
		.replace(/^[-*+]\s+/gm, " ")
		.replace(/^\d+\.\s+/gm, " ")
		.replace(/^---+$/gm, " ");
	s = s.replace(/\s+/g, " ").trim();
	/* Lien readme alternatif en tête du fichier : « EN_Readme.md … » */
	s = s.replace(/^[A-Za-z0-9_.-]+\.md\s+/u, "");
	return s;
}

function readmeSummary(raw, maxLen = 2200) {
	const plain = markdownToPlain(raw);
	if (!plain) return "";
	if (plain.length <= maxLen) return plain;
	const cut = plain.slice(0, maxLen);
	const last = cut.lastIndexOf(". ");
	return last > 400 ? cut.slice(0, last + 1) : `${cut.trim()}…`;
}

/** Fragment inline pour titres / listes (gras, code court). */
function parseInlineParts(str) {
	if (!str) return [{ k: "text", v: "" }];
	const parts = [];
	let s = String(str);
	while (s.length) {
		if (s.startsWith("**")) {
			const end = s.indexOf("**", 2);
			if (end === -1) {
				parts.push({ k: "text", v: s });
				break;
			}
			parts.push({ k: "bold", v: s.slice(2, end) });
			s = s.slice(end + 2);
			continue;
		}
		if (s[0] === "`") {
			const end = s.indexOf("`", 1);
			if (end === -1) {
				parts.push({ k: "text", v: s });
				break;
			}
			parts.push({ k: "code", v: s.slice(1, end) });
			s = s.slice(end + 1);
			continue;
		}
		let n = s.length;
		const bi = s.indexOf("**");
		const ci = s.indexOf("`");
		if (bi !== -1) n = Math.min(n, bi);
		if (ci !== -1) n = Math.min(n, ci);
		parts.push({ k: "text", v: s.slice(0, n) });
		s = s.slice(n);
	}
	const merged = [];
	for (const p of parts) {
		if (p.k === "text" && p.v === "") continue;
		const last = merged[merged.length - 1];
		if (last?.k === "text" && p.k === "text") last.v += p.v;
		else merged.push({ k: p.k, v: p.v });
	}
	return merged.length ? merged : [{ k: "text", v: str }];
}

function isTableLine(line) {
	const t = line.trim();
	return t.startsWith("|") && t.includes("|", 1);
}

function isLikelyTableSep(t) {
	const x = t.trim();
	return x.includes("|") && x.includes("-") && /^[\s|\-:]+$/.test(x);
}

/** README brut → blocs structurés pour la page détail (titres, listes, code, citations). */
function readmeToBlocks(raw, { maxBlocks = 100, maxCode = 12000 } = {}) {
	if (!raw?.trim()) return [];
	const lines = raw.replace(/\r\n/g, "\n").split("\n");
	const blocks = [];
	let i = 0;

	while (i < lines.length && blocks.length < maxBlocks) {
		const line = lines[i];
		const t = line.trim();

		if (isTableLine(line) || isLikelyTableSep(t)) {
			while (i < lines.length && (isTableLine(lines[i]) || isLikelyTableSep(lines[i].trim()))) i++;
			continue;
		}

		if (t.startsWith("```")) {
			const lang = t.slice(3).trim() || null;
			i++;
			const codeLines = [];
			while (i < lines.length && !lines[i].trim().startsWith("```")) {
				codeLines.push(lines[i]);
				i++;
			}
			if (i < lines.length) i++;
			let code = codeLines.join("\n");
			if (code.length > maxCode) code = `${code.slice(0, maxCode)}\n…`;
			blocks.push({ type: "code", lang, code });
			continue;
		}

		const hm = t.match(/^(#{1,3})\s+(.+)$/);
		if (hm) {
			blocks.push({ type: "heading", level: hm[1].length, text: hm[2].trim() });
			i++;
			continue;
		}

		if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
			blocks.push({ type: "rule" });
			i++;
			continue;
		}

		if (t.startsWith(">")) {
			const q = [];
			while (i < lines.length) {
				const tr = lines[i].trim();
				if (!tr) break;
				if (!tr.startsWith(">")) break;
				q.push(tr.replace(/^>\s?/, ""));
				i++;
			}
			if (q.length) blocks.push({ type: "quote", parts: parseInlineParts(q.join(" ")) });
			continue;
		}

		if (/^[-*+]\s/.test(t) || /^\d+\.\s/.test(t)) {
			const ordered = /^\d+\.\s/.test(t);
			const items = [];
			while (i < lines.length) {
				const L = lines[i];
				const tr = L.trim();
				if (!tr) break;
				const ul = /^[-*+]\s+(.*)$/.exec(tr);
				const ol = /^(\d+)\.\s+(.*)$/.exec(tr);
				if (ordered && ol) {
					items.push(parseInlineParts(ol[2]));
					i++;
					continue;
				}
				if (!ordered && ul) {
					items.push(parseInlineParts(ul[1]));
					i++;
					continue;
				}
				if (ordered && ul) break;
				if (!ordered && ol) break;
				break;
			}
			if (items.length) blocks.push({ type: "list", ordered, items });
			continue;
		}

		if (!t) {
			i++;
			continue;
		}

		const para = [];
		while (i < lines.length) {
			const L = lines[i];
			const tr = L.trim();
			if (!tr) break;
			if (tr.startsWith("```")) break;
			if (/^(#{1,3})\s/.test(tr)) break;
			if (/^(-{3,}|\*{3,}|_{3,})$/.test(tr)) break;
			if (tr.startsWith(">")) break;
			if (/^[-*+]\s/.test(tr) || /^\d+\.\s/.test(tr)) break;
			if (isTableLine(L) || isLikelyTableSep(tr)) break;
			para.push(L.trimEnd());
			i++;
		}
		const text = para.join(" ").replace(/\s+/g, " ").trim();
		if (text) blocks.push({ type: "paragraph", parts: parseInlineParts(text) });
	}

	return blocks;
}

/** Sections page détail : blocs README ou repli description / message. */
function sectionsFromReadme(readmeRaw, description) {
	const desc = (description || "").trim();
	const blocks = readmeToBlocks(readmeRaw);
	if (blocks.length) return blocks;
	if (desc) return [{ type: "paragraph", parts: parseInlineParts(desc) }];
	return [
		{
			type: "paragraph",
			parts: parseInlineParts(
				"Aucun README détecté sur ce dépôt. Ajoute un README sur GitHub pour enrichir cette page.",
			),
		},
	];
}

async function mapRepo(r) {
	const owner = r.owner?.login || USERNAME;
	const name = r.name;
	const ownRepo = owner.toLowerCase() === USERNAME.toLowerCase();
	/* Slug court pour tes repos ; owner-name pour les dépôts où tu es collaborateur (évite collisions) */
	const slug = ownRepo ? slugifyRepoName(name) : slugifyRepoName(`${owner}-${name}`);
	const title = ownRepo ? name : `${owner}/${name}`;
	const [topics, langs, readmeRaw] = await Promise.all([
		fetchTopics(owner, name),
		fetchLanguages(owner, name),
		fetchReadmeRaw(owner, name),
	]);
	const stack = topics.length > 0 ? topics : langs;
	const description = (r.description || "").trim() || readmeSummary(readmeRaw, 280) || name;
	const sections = sectionsFromReadme(readmeRaw, r.description);

	return {
		slug,
		title,
		description,
		stack,
		href: r.html_url,
		liveHref: null,
		coverImage: null,
		sections,
	};
}

function countProjectsInExistingFile() {
	if (!fs.existsSync(outPath)) return 0;
	try {
		const raw = JSON.parse(fs.readFileSync(outPath, "utf8"));
		return Array.isArray(raw.projects) ? raw.projects.length : 0;
	} catch {
		return 0;
	}
}

/** En local uniquement : si l’API échoue (rate limit, réseau…) mais qu’on a déjà un JSON, on garde le dev qui tourne. */
function tryExitWithExistingJson(err) {
	if (process.env.GITHUB_ACTIONS === "true") return false;
	const msg = String(err?.message || err);
	const recoverable =
		/403|401|rate limit|fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|socket/i.test(msg);
	if (!recoverable) return false;
	const n = countProjectsInExistingFile();
	if (n < 1) return false;
	console.warn(`[sync-github] API GitHub indisponible ou quota dépassé — conservation du fichier existant (${n} projet(s)).`);
	console.warn("[sync-github] Pour resynchroniser : API_KEY_PORTFOLIO ou GITHUB_TOKEN dans .env (ou secret en CI).");
	process.exit(0);
	return true;
}

async function main() {
	console.info(
		`[sync-github] Compte cible : ${USERNAME}${TOKEN ? " (token présent — dépôts perso + collaborateur publics)" : " (sans token — uniquement dépôts publics du compte, limite API basse)"}`,
	);

	let repos;
	try {
		repos = await fetchAllPublicReposForPortfolio();
	} catch (e) {
		tryExitWithExistingJson(e);
		throw e;
	}
	console.info(`[sync-github] ${repos.length} dépôt(s) public(s) à traiter`);

	const projects = [];
	for (let i = 0; i < repos.length; i++) {
		const r = repos[i];
		process.stdout.write(`\r[sync-github] ${i + 1}/${repos.length} ${r.name}`.padEnd(60, " "));
		try {
			projects.push(await mapRepo(r));
		} catch (e) {
			console.warn(`\n[sync-github] Ignoré ${r.name}:`, e.message || e);
		}
		if (!TOKEN && i < repos.length - 1) {
			await new Promise((res) => setTimeout(res, 150));
		}
	}
	console.info("");

	// Slugs uniques (collision rare)
	const seen = new Set();
	for (const p of projects) {
		let s = p.slug;
		let n = 0;
		while (seen.has(s)) {
			n += 1;
			s = `${p.slug}-${n}`;
		}
		seen.add(s);
		p.slug = s;
	}

	const payload = {
		syncedAt: new Date().toISOString(),
		sourceUser: USERNAME,
		projects,
	};

	fs.mkdirSync(path.dirname(outPath), { recursive: true });
	fs.writeFileSync(outPath, `${JSON.stringify(payload, null, "\t")}\n`, "utf8");
	console.info(`[sync-github] Écrit : ${path.relative(root, outPath)}`);
}

main().catch((e) => {
	console.error("[sync-github] Erreur :", e);
	process.exit(1);
});
