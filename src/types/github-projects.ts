/** Entrée liste pour cartes / strip (données sync GitHub). */
export type GithubProjectCard = {
	slug: string;
	title: string;
	description: string;
	href: string;
	/** Topics GitHub, sinon langages (voir sync-github-projects). */
	stack?: string[];
};
