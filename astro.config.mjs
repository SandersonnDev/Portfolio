// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

/** Sous-chemin GitHub Pages pour un dépôt « projet » (ex. /Portfolio/). En local, /. */
function githubPagesBase() {
	const repo = process.env.GITHUB_REPOSITORY;
	if (!repo) return "/";
	const [owner, name] = repo.split("/");
	if (!owner || !name) return "/";
	if (name.toLowerCase() === `${owner.toLowerCase()}.github.io`) return "/";
	return `/${name}/`;
}

/** URL du site Pages (canonical). Absent en local si pas de GITHUB_REPOSITORY. */
function githubPagesSite() {
	const repo = process.env.GITHUB_REPOSITORY;
	if (!repo) return undefined;
	const [owner] = repo.split("/");
	return owner ? `https://${owner}.github.io` : undefined;
}

export default defineConfig({
	site: githubPagesSite(),
	base: githubPagesBase(),
	vite: {
		plugins: [tailwindcss()],
	},
});
