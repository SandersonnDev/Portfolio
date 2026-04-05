export interface ReadmeInlinePart {
	k: string;
	v: string;
}

export type ReadmeBlock =
	| { type: "heading"; level: number; text: string }
	| { type: "paragraph"; parts?: ReadmeInlinePart[]; text?: string }
	| { type: "list"; ordered: boolean; items: ReadmeInlinePart[][] }
	| { type: "code"; lang: string | null; code: string }
	| { type: "rule" }
	| { type: "quote"; parts: ReadmeInlinePart[] };
