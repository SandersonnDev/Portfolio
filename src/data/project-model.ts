export type ProjectSection =
	| { type: "paragraph"; text: string }
	| { type: "image"; src?: string; alt: string; caption?: string }
	| { type: "video"; caption?: string; embedUrl?: string; mp4Url?: string };

export type Project = {
	slug: string;
	title: string;
	description: string;
	stack: string[];
	href: string;
	liveHref?: string | null;
	sections: ProjectSection[];
};
