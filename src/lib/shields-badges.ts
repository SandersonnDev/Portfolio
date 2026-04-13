/**
 * Couleurs de fond proches des marques (simple-icons / usages Shields courants).
 * Valeur optionnelle = `logoColor` (sinon blanc par défaut, sauf fonds très clairs).
 */
const TOPIC_STYLE: Record<string, readonly [string, string?]> = {
	astro: ["BC52EE"],
	css: ["264DE4"],
	docker: ["2496ED"],
	eslint: ["4B32C3"],
	firebase: ["FFCA28", "1a1a24"],
	flutter: ["02569B"],
	git: ["F05032"],
	github: ["181717"],
	go: ["00ADD8", "1a1a24"],
	graphql: ["E10098"],
	html: ["E34F26"],
	html5: ["E34F26"],
	java: ["ED8B00", "1a1a24"],
	javascript: ["F7DF1E", "222222"],
	jest: ["C21325"],
	kotlin: ["7F52FF"],
	kubernetes: ["326CE5"],
	markdown: ["000000"],
	mongodb: ["47A248"],
	mysql: ["4479A1"],
	nginx: ["009639"],
	node: ["5FA04E", "1a1a24"],
	nodejs: ["5FA04E", "1a1a24"],
	nuxt: ["00DC82", "1a1a24"],
	php: ["777BB4"],
	python: ["3776AB"],
	react: ["20232A"],
	redis: ["DC382D"],
	rollup: ["EC4A3F"],
	rust: ["CE422B"],
	svelte: ["FF3E00"],
	supabase: ["3ECF8E", "1a1a24"],
	swift: ["FA7343"],
	tailwindcss: ["06B6D4", "1a1a24"],
	tailwind: ["06B6D4", "1a1a24"],
	typescript: ["3178C6"],
	vite: ["646CFF"],
	vue: ["4FC08D", "1a1a24"],
	vuejs: ["4FC08D", "1a1a24"],
	webpack: ["8DD6F9", "1a1a24"],
	yaml: ["CB171E"],
	nextjs: ["000000"],
	nextdotjs: ["000000"],
	angular: ["DD0031"],
	express: ["000000"],
	nestjs: ["E0234E"],
	prisma: ["2D3748"],
	vercel: ["000000"],
	netlify: ["00C7B7", "1a1a24"],
	aws: ["232F3E"],
	gcp: ["4285F4"],
};

/** Palette de secours (harmonisée avec l’accent indigo du site) quand le topic n’est pas listé. */
const FALLBACK_BG = ["6366f1", "8b5cf6", "0ea5e9", "14b8a6", "d946ef", "4f46e5", "0d9488"] as const;

function normalizeTopicKey(topic: string): string {
	return topic
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "")
		.replace(/\./g, "dot")
		.replace(/\+/g, "p");
}

function fallbackBg(topic: string): string {
	let h = 0;
	for (let i = 0; i < topic.length; i++) {
		h = (h + topic.charCodeAt(i) * (i + 3)) % 1009;
	}
	return FALLBACK_BG[h % FALLBACK_BG.length]!;
}

function styleForTopic(topic: string): {
	color: string;
	logoColor: string;
	/** Slug simple-icons : seulement si connu, sinon omis (évite badges cassés / vides). */
	logoSlug: string | null;
} {
	const raw = topic.trim();
	const key = normalizeTopicKey(raw);
	const hit = TOPIC_STYLE[key];
	if (hit) {
		const [bg, logo] = hit;
		return { color: bg, logoColor: logo ?? "ffffff", logoSlug: key };
	}
	return { color: fallbackBg(raw), logoColor: "ffffff", logoSlug: null };
}

/**
 * URL d’un badge Shields.io pour un topic / techno du stack (données sync GitHub).
 * @see https://shields.io/
 */
export function shieldsStackBadgeUrl(topic: string): string {
	const t = topic.trim();
	if (!t) {
		return "https://img.shields.io/badge/-n%2Fa-6366f1?style=flat-square&logoColor=ffffff";
	}

	const label = encodeURIComponent(t.replace(/-/g, "--").replace(/_/g, "__"));
	const { color, logoColor, logoSlug } = styleForTopic(t);
	const logoQs =
		logoSlug != null ? `&logo=${encodeURIComponent(logoSlug)}&logoColor=${logoColor}` : "";

	return `https://img.shields.io/badge/${label}-${color}?style=flat-square${logoQs}`;
}
