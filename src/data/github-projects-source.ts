import type { Project } from "./project-model";
import githubBundle from "./github-projects.generated.json";

type GithubBundle = {
	syncedAt: string | null;
	sourceUser: string;
	projects: Project[];
};

const bundle = githubBundle as GithubBundle;

/** Dépôts publics synchronisés depuis GitHub (`npm run sync:github` ou au `dev` / `build`). */
export const projects: Project[] = bundle.projects;
