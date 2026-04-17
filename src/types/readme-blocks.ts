export type ReadmeInlinePart =
	| { k: "text"; v: string }
	| { k: "bold"; v: string }
	| { k: "code"; v: string }
	| { k: "link"; label: string; href: string };
export type ReadmeTagTableRow = {
    label: string;
    hint: string;
    href: string;
};
export type ReadmeBadgeStripItem = {
    href: string | null;
    imgSrc: string;
    alt: string;
};
export type ReadmeMarkdownTableBlock = {
    type: "table";
    header: ReadmeInlinePart[][] | null;
    rows: ReadmeInlinePart[][][];
};
export type ReadmeBlock = {
    type: "heading";
    level: number;
    text: string;
} | {
    type: "paragraph";
    parts?: ReadmeInlinePart[];
    text?: string;
} | {
    type: "list";
    ordered: boolean;
    items: ReadmeInlinePart[][];
} | {
    type: "code";
    lang: string | null;
    code: string;
} | {
    type: "rule";
} | {
    type: "quote";
    parts: ReadmeInlinePart[];
} | {
    type: "tagTable";
    rows: ReadmeTagTableRow[];
} | {
    type: "badgeStrip";
    items: ReadmeBadgeStripItem[];
} | ReadmeMarkdownTableBlock;
