import { isTransitionBeforePreparationEvent } from "astro:transitions/client";

function normalizePathname(p: string): string {
	const x = p.replace(/\/$/, "");
	return x === "" ? "/" : x;
}

const PROJECT_DETAIL_PATH_RE = /\/projets\/[^/]+$/;

function isProjectDetailPathname(pathname: string): boolean {
	return PROJECT_DETAIL_PATH_RE.test(normalizePathname(pathname));
}

/** Précédent / suivant : forcer direction View Transition pour les animations fiche. */
export function initProjectDetailNavTransitionDirection(ac: AbortController) {
	document.addEventListener(
		"astro:before-preparation",
		(e) => {
			if (!isTransitionBeforePreparationEvent(e)) return;
			if (!isProjectDetailPathname(e.from.pathname) || !isProjectDetailPathname(e.to.pathname)) return;
			const src = e.sourceElement;
			if (!(src instanceof Element)) return;
			const nav = src.closest("[data-project-nav]");
			if (!nav) return;
			const which = nav.getAttribute("data-project-nav");
			if (which === "prev") e.direction = "back";
			else if (which === "next") e.direction = "forward";
		},
		{ signal: ac.signal },
	);
}
