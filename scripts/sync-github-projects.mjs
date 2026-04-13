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
/** Secret dépôt (API_KEY_PORTFOLIO) ou GITHUB_TOKEN / GH_TOKEN — peut être vidé si l’API renvoie 401. */
let authToken = (
	process.env.API_KEY_PORTFOLIO ||
	process.env.GITHUB_TOKEN ||
	process.env.GH_TOKEN ||
	""
).trim();
const tokenWasConfigured = authToken.length > 0;

function ghHeaders() {
	const h = {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
	};
	if (authToken) h.Authorization = `Bearer ${authToken}`;
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
	if (!authToken) {
		return fetchAllPublicReposForUser(USERNAME);
	}
	try {
		return await fetchAllPublicReposAsAuthenticatedUser();
	} catch (e) {
		const msg = String(e?.message || e);
		if (!/GitHub 401\b/.test(msg)) throw e;
		console.warn(
			"[sync-github] Token refusé (401 Bad credentials) — poursuite sans ce token (dépôts publics du compte uniquement). En CI : vérifie le secret API_KEY_PORTFOLIO (PAT valide, non expiré).",
		);
		authToken = "";
		return fetchAllPublicReposForUser(USERNAME);
	}
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

const DEMO_LINK_LABEL =
	/d[ée]mo|live(\s+demo)?|aper[cç]u|essai|try\s*it|website|site\s*web|^site$|^app$/i;
const DEMO_HOST_HINT =
	/github\.io|\.github\.io|pages\.dev|vercel\.app|netlify\.app|cloudflarepages|surge\.sh|\.web\.app|firebaseapp\.com/i;

/** URL de démo : liens explicites (libellé ou hébergeur) dans le README. */
function extractDemoUrlFromReadme(raw) {
	if (!raw) return null;
	const re = /\[([^\]]+)\]\((https?:[^)\s]+)\)/g;
	const candidates = [];
	let m;
	while ((m = re.exec(raw)) !== null) {
		const label = m[1].replace(/\s+/g, " ").trim();
		const href = m[2];
		if (/^\s*!\[/.test(label)) continue;
		if (!/^https?:\/\//i.test(href)) continue;
		const score = (DEMO_HOST_HINT.test(href) ? 4 : 0) + (DEMO_LINK_LABEL.test(label) ? 2 : 0);
		if (score > 0) candidates.push({ href, score });
	}
	if (!candidates.length) return null;
	candidates.sort((a, b) => b.score - a.score);
	return candidates[0].href;
}

function pickLiveHref(homepage, readmeRaw) {
	const h = (homepage || "").trim();
	if (/^https?:\/\//i.test(h)) return h;
	return extractDemoUrlFromReadme(readmeRaw);
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

function splitTableRow(line) {
	const parts = line.trim().split("|");
	let cells = parts.map((c) => c.trim());
	if (cells[0] === "") cells.shift();
	if (cells.length && cells[cells.length - 1] === "") cells.pop();
	return cells;
}

function isSeparatorRow(cells) {
	return (
		cells.length > 0 &&
		cells.every((c) => {
			const x = c.replace(/\s/g, "");
			return /^:?-{2,}:?$/.test(x);
		})
	);
}

function stripCellMd(s) {
	if (!s) return "";
	return s
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/\*([^*]+)\*/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.trim();
}

/** Première image-badge ou lien markdown dans une cellule de tableau (shields, liens package.json, etc.). */
function extractPrimaryLinkFromCell(cell) {
	const c = cell.trim();
	if (!c) return null;
	const badgeRe = /\[!\[([^\]]*)\]\([^)]*\)\]\((https?:[^)\s]+)\)/g;
	let bm;
	let fromBadge = null;
	while ((bm = badgeRe.exec(c)) !== null) {
		if (!fromBadge)
			fromBadge = {
				href: bm[2],
				linkText: bm[1].replace(/\s+/g, " ").trim(),
			};
	}
	if (fromBadge) return fromBadge;

	const simpleRe = /\[([^\]]+)\]\((https?:[^)\s]+)\)/g;
	let sm;
	while ((sm = simpleRe.exec(c)) !== null) {
		if (/^\s*!\[/.test(sm[1])) continue;
		return { href: sm[2], linkText: sm[1].replace(/\s+/g, " ").trim() };
	}

	const bare = /(https?:\/\/[^\s)<>"']+)/.exec(c);
	if (bare) return { href: bare[1], linkText: "" };
	return null;
}

/**
 * Tableau GFM à 2 colonnes dont chaque ligne de données contient un lien en 2e colonne
 * (badges shields, liens vers package.json, licence…).
 */
function tryParseBadgeTable(tableLines) {
	if (!tableLines.length) return null;
	const rows = tableLines.map(splitTableRow).filter((r) => r.some((c) => c.length > 0));
	if (rows.length < 1) return null;

	let dataStart = 0;
	if (rows.length >= 2 && isSeparatorRow(rows[1])) dataStart = 2;
	else if (rows.length >= 2 && isSeparatorRow(rows[0])) dataStart = 1;

	const dataRows = rows.slice(dataStart);
	if (!dataRows.length) return null;

	const tagRows = [];
	for (const r of dataRows) {
		if (r.length < 2) return null;
		const col1 = stripCellMd(r[0]);
		const link = extractPrimaryLinkFromCell(r[1]);
		if (!link?.href) return null;
		const hint = (link.linkText || "").trim();
		const label = col1;
		let hintOut = hint;
		if (label && hint && label.toLowerCase() === hint.toLowerCase()) hintOut = "";
		tagRows.push({ label, hint: hintOut, href: link.href });
	}

	if (!tagRows.length) return null;
	return { type: "tagTable", rows: tagRows };
}

/**
 * Paragraphe constitué uniquement de liens markdown (badges ou [Version npm](url) …),
 * souvent en une ligne sous le titre du README.
 */
function tryParseLinkOnlyParagraph(text) {
	let rest = text.trim();
	if (!rest) return null;
	const rows = [];
	while (rest.length) {
		rest = rest.trimStart();
		let m = /^\[!\[([^\]]*)\]\([^)]*\)\]\((https?:[^)\s]+)\)/.exec(rest);
		if (m) {
			const hint = (m[1] || "").replace(/\s+/g, " ").trim();
			rows.push({ label: "", hint: hint || "Badge", href: m[2] });
			rest = rest.slice(m[0].length);
			continue;
		}
		m = /^\[([^\]]+)\]\((https?:[^)\s]+)\)/.exec(rest);
		if (!m) return null;
		const linkText = m[1].replace(/\s+/g, " ").trim();
		const href = m[2];
		const parts = linkText.split(/\s+/);
		let label = "";
		let hint = linkText;
		if (parts.length >= 2) {
			hint = parts[parts.length - 1];
			label = parts.slice(0, -1).join(" ");
		}
		let hintOut = hint;
		if (label && hint && label.toLowerCase() === hint.toLowerCase()) hintOut = "";
		rows.push({ label, hint: hintOut, href });
		rest = rest.slice(m[0].length);
	}
	return rows.length ? { type: "tagTable", rows } : null;
}

function decodeHtmlAttrValue(s) {
	if (s == null || s === "") return "";
	return String(s)
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/g, "'")
		.trim();
}

function parseHtmlQuotedAttr(tag, attrName) {
	const re = new RegExp(`\\b${attrName}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i");
	const m = re.exec(tag);
	if (!m) return "";
	return decodeHtmlAttrValue(m[2]);
}

/** Chemins relatifs README → raw GitHub (branche par défaut du dépôt). */
function resolveReadmeImgSrc(src, { owner, name, defaultBranch }) {
	const s = decodeHtmlAttrValue(src).replace(/\s+/g, "");
	if (!s) return s;
	if (/^https?:\/\//i.test(s)) return s;
	if (s.startsWith("//")) return `https:${s}`;
	const path = s.replace(/^\/+/, "");
	return `https://raw.githubusercontent.com/${owner}/${name}/${defaultBranch}/${path}`;
}

function nextImgTagChunk(html, fromIdx) {
	const lower = html.toLowerCase();
	const idx = lower.indexOf("<img", fromIdx);
	if (idx === -1) return null;
	let end = html.indexOf("/>", idx);
	if (end !== -1) end += 2;
	else {
		end = html.indexOf(">", idx);
		if (end === -1) return null;
		end += 1;
	}
	return { start: idx, end, tag: html.slice(idx, end) };
}

/**
 * Contenu d’un `<p align="center">…</p>` : logos seuls ou rangées de badges `<a><img>`.
 */
function parseCenteredHtmlParagraph(innerHtml, ctx) {
	const items = [];
	let pos = 0;
	const len = innerHtml.length;
	while (pos < len) {
		const rest = innerHtml.slice(pos);
		const aLower = rest.toLowerCase();
		const aRel = aLower.indexOf("<a");
		const imgPeek = nextImgTagChunk(innerHtml, pos);
		const imgRelIdx = imgPeek ? imgPeek.start - pos : -1;
		const useLoneImg = imgPeek != null && (aRel === -1 || imgRelIdx < aRel);
		if (useLoneImg) {
			const src = parseHtmlQuotedAttr(imgPeek.tag, "src");
			const alt = parseHtmlQuotedAttr(imgPeek.tag, "alt");
			if (src) items.push({ href: null, imgSrc: resolveReadmeImgSrc(src, ctx), alt });
			pos = imgPeek.end;
			continue;
		}
		if (aRel === -1) break;
		pos += aRel;
		const aOpenEnd = innerHtml.indexOf(">", pos);
		if (aOpenEnd === -1) break;
		const aTag = innerHtml.slice(pos, aOpenEnd + 1);
		const href = parseHtmlQuotedAttr(aTag, "href");
		const closeA = innerHtml.toLowerCase().indexOf("</a>", aOpenEnd);
		if (closeA === -1) break;
		const innerA = innerHtml.slice(aOpenEnd + 1, closeA);
		const imgInA = nextImgTagChunk(innerA, 0);
		if (href && imgInA) {
			const src = parseHtmlQuotedAttr(imgInA.tag, "src");
			const alt = parseHtmlQuotedAttr(imgInA.tag, "alt");
			if (src) items.push({ href, imgSrc: resolveReadmeImgSrc(src, ctx), alt });
		}
		pos = closeA + 4;
	}
	return items.length ? { type: "badgeStrip", items } : null;
}

const RE_HTML_CENTER_P =
	/<p\b[^>]*\balign\s*=\s*(?:"center"|'center'|center)\s*[^>]*>[\s\S]*?<\/p>/gi;

function parseHtmlCenterPBlock(full, ctx) {
	const m = full.match(/^<p\b[^>]*>([\s\S]*)<\/p>\s*$/i);
	if (!m) return null;
	return parseCenteredHtmlParagraph(m[1].trim(), ctx);
}

/**
 * README markdown + blocs HTML centrés (badges shields), dans l’ordre du fichier.
 */
function readmeToBlocksInterleaved(raw, ctx, { maxBlocks = 100, maxCode = 12000 } = {}) {
	if (!raw?.trim()) return [];
	const blocks = [];
	let lastIdx = 0;
	RE_HTML_CENTER_P.lastIndex = 0;
	let match;
	while ((match = RE_HTML_CENTER_P.exec(raw)) !== null) {
		const before = raw.slice(lastIdx, match.index);
		const room = Math.max(0, maxBlocks - blocks.length);
		if (before.trim() && room > 0) {
			for (const b of readmeToBlocks(before, { maxBlocks: room, maxCode })) {
				blocks.push(b);
				if (blocks.length >= maxBlocks) return blocks;
			}
		}
		const strip = parseHtmlCenterPBlock(match[0], ctx);
		if (strip && blocks.length < maxBlocks) blocks.push(strip);
		lastIdx = match.index + match[0].length;
	}
	const tail = raw.slice(lastIdx);
	const roomTail = Math.max(0, maxBlocks - blocks.length);
	if (tail.trim() && roomTail > 0) {
		for (const b of readmeToBlocks(tail, { maxBlocks: roomTail, maxCode })) {
			blocks.push(b);
			if (blocks.length >= maxBlocks) return blocks;
		}
	}
	return blocks;
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
			const tableLines = [];
			while (i < lines.length) {
				const L = lines[i];
				const tr = L.trim();
				if (isTableLine(L)) {
					tableLines.push(L);
					i++;
					continue;
				}
				if (isLikelyTableSep(tr)) {
					tableLines.push(L);
					i++;
					continue;
				}
				break;
			}
			const tagBlock = tryParseBadgeTable(tableLines);
			if (tagBlock && blocks.length < maxBlocks) blocks.push(tagBlock);
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
		if (text) {
			const linkOnly = tryParseLinkOnlyParagraph(text);
			if (linkOnly) blocks.push(linkOnly);
			else blocks.push({ type: "paragraph", parts: parseInlineParts(text) });
		}
	}

	return blocks;
}

/** Sections page détail : blocs README ou repli description / message. */
function sectionsFromReadme(readmeRaw, description, readmeCtx) {
	const desc = (description || "").trim();
	const blocks = readmeCtx
		? readmeToBlocksInterleaved(readmeRaw, readmeCtx)
		: readmeToBlocks(readmeRaw);
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
	const defaultBranch = (r.default_branch || "main").trim() || "main";
	const sections = sectionsFromReadme(readmeRaw, r.description, { owner, name, defaultBranch });

	return {
		slug,
		title,
		description,
		stack,
		href: r.html_url,
		liveHref: pickLiveHref(r.homepage, readmeRaw),
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

/** Si l’API échoue (rate limit, réseau, token invalide après échecs…) mais qu’on a déjà un JSON, on conserve le fichier (local + CI). */
function tryExitWithExistingJson(err) {
	const msg = String(err?.message || err);
	const recoverable =
		/403|401|rate limit|fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|socket/i.test(msg);
	if (!recoverable) return false;
	const n = countProjectsInExistingFile();
	if (n < 1) return false;
	console.warn(`[sync-github] API GitHub indisponible ou quota dépassé — conservation du fichier existant (${n} projet(s)).`);
	console.warn("[sync-github] Pour resynchroniser : API_KEY_PORTFOLIO ou GITHUB_TOKEN dans .env (ou secret en CI).");
	/* process.exit() après fetch (undici) peut déclencher une assertion libuv sur Windows ; on s’en remet à exitCode. */
	process.exitCode = 0;
	return true;
}

async function main() {
	console.info(
		`[sync-github] Compte cible : ${USERNAME}${tokenWasConfigured ? " (token configuré — dépôts perso + collaborateur si le token est valide)" : " (sans token — uniquement dépôts publics du compte, limite API basse)"}`,
	);

	let repos;
	try {
		repos = await fetchAllPublicReposForPortfolio();
	} catch (e) {
		if (tryExitWithExistingJson(e)) return;
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
		if (!authToken && i < repos.length - 1) {
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
	process.exitCode = 1;
});
