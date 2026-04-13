export interface ReadmeInlinePart {
	k: string;
	v: string;
}

export type ReadmeTagTableRow = {
	/** Colonne gauche (ex. « Version », « Licence ») */
	label: string;
	/** Texte du lien / badge (ex. « npm », « MIT ») — peut être vide */
	hint: string;
	href: string;
};

/** Badges HTML type GitHub : `<p align="center"><a><img …></a>…</p>` */
export type ReadmeBadgeStripItem = {
	href: string | null;
	imgSrc: string;
	alt: string;
};

/** Tableau Markdown classique (GFM), hors tableaux-badges. */
export type ReadmeMarkdownTableBlock = {
	type: "table";
	header: ReadmeInlinePart[][] | null;
	rows: ReadmeInlinePart[][][];
};

export type ReadmeBlock =
	| { type: "heading"; level: number; text: string }
	| { type: "paragraph"; parts?: ReadmeInlinePart[]; text?: string }
	| { type: "list"; ordered: boolean; items: ReadmeInlinePart[][] }
	| { type: "code"; lang: string | null; code: string }
	| { type: "rule" }
	| { type: "quote"; parts: ReadmeInlinePart[] }
	| { type: "tagTable"; rows: ReadmeTagTableRow[] }
	| { type: "badgeStrip"; items: ReadmeBadgeStripItem[] }
	| ReadmeMarkdownTableBlock;
