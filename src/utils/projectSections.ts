import type { ProjectSection } from "../data/portfolio";

export type ProjectChunk =
	| { kind: "paragraph"; text: string }
	| { kind: "images"; items: Extract<ProjectSection, { type: "image" }>[] }
	| { kind: "video"; section: Extract<ProjectSection, { type: "video" }> };

export function chunkProjectSections(sections: ProjectSection[]): ProjectChunk[] {
	const chunks: ProjectChunk[] = [];
	const imageBuffer: Extract<ProjectSection, { type: "image" }>[] = [];

	const flushImages = () => {
		if (imageBuffer.length > 0) {
			chunks.push({ kind: "images", items: [...imageBuffer] });
			imageBuffer.length = 0;
		}
	};

	for (const s of sections) {
		if (s.type === "paragraph") {
			flushImages();
			chunks.push({ kind: "paragraph", text: s.text });
		} else if (s.type === "image") {
			imageBuffer.push(s);
		} else if (s.type === "video") {
			flushImages();
			chunks.push({ kind: "video", section: s });
		}
	}
	flushImages();
	return chunks;
}
