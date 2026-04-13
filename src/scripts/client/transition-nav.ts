function normalizePathname(p: string): string {
	const x = p.replace(/\/$/, "");
	return x === "" ? "/" : x;
}

const PROJECT_DETAIL_PATH_RE = /\/projets\/[^/]+$/;

/** Marqueur pour GSAP après un saut précédent / suivant entre fiches (navigation MPA). */
export const PROJECT_INTER_NAV_STORAGE_KEY = "projArticleInterNav";

/** `prev` | `next` — sens pour effets GSAP optionnels. */
export const PROJECT_INTER_NAV_DIR_KEY = "projArticleDir";

/** Entrée MPA : fondu accueil → fiche (`from-home`) ou fiche → hors-fiche (`from-project`). */
export const ROUTE_ENTER_STORAGE_KEY = "routeEnter";

function isProjectDetailPathname(pathname: string): boolean {
	return PROJECT_DETAIL_PATH_RE.test(normalizePathname(pathname));
}

/**
 * Clic sur précédent / suivant entre fiches : écrit sessionStorage avant la navigation pleine page.
 * (Sans ClientRouter, `astro:before-preparation` n’existe pas.)
 */
export function initProjectDetailNavTransitionDirection(ac: AbortController) {
	document.addEventListener(
		"click",
		(e) => {
			const el = (e.target as HTMLElement | null)?.closest("a[href][data-project-nav]");
			if (!el || !(el instanceof HTMLAnchorElement)) return;

			let toUrl: URL;
			try {
				toUrl = new URL(el.href);
			} catch {
				return;
			}
			if (toUrl.origin !== location.origin) return;

			const nav = el.closest("[data-project-nav]");
			if (!nav) return;

			const fromPath = normalizePathname(location.pathname);
			const toPath = normalizePathname(toUrl.pathname);

			if (!isProjectDetailPathname(fromPath) || !isProjectDetailPathname(toPath)) {
				sessionStorage.removeItem(PROJECT_INTER_NAV_STORAGE_KEY);
				sessionStorage.removeItem(PROJECT_INTER_NAV_DIR_KEY);
				return;
			}

			const which = nav.getAttribute("data-project-nav");
			if (which === "prev") {
				sessionStorage.setItem(PROJECT_INTER_NAV_STORAGE_KEY, "1");
				sessionStorage.setItem(PROJECT_INTER_NAV_DIR_KEY, "prev");
			} else if (which === "next") {
				sessionStorage.setItem(PROJECT_INTER_NAV_STORAGE_KEY, "1");
				sessionStorage.setItem(PROJECT_INTER_NAV_DIR_KEY, "next");
			} else {
				sessionStorage.removeItem(PROJECT_INTER_NAV_STORAGE_KEY);
				sessionStorage.removeItem(PROJECT_INTER_NAV_DIR_KEY);
			}
		},
		{ capture: true, signal: ac.signal },
	);
}

/**
 * Clic interne : marque une entrée « depuis l’accueil » ou « depuis une fiche » pour le fondu au chargement.
 * Ignore les sauts fiche → fiche (déjà couverts par le slide du journal).
 */
export function initRouteEnterMarkers(ac: AbortController) {
	document.addEventListener(
		"click",
		(e) => {
			if (e.defaultPrevented || e.button !== 0) return;
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

			const el = (e.target as HTMLElement | null)?.closest("a[href]");
			if (!el || !(el instanceof HTMLAnchorElement)) return;

			const raw = el.getAttribute("href");
			if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:")) return;

			let toUrl: URL;
			try {
				toUrl = new URL(el.href);
			} catch {
				return;
			}
			if (toUrl.origin !== location.origin) return;

			const fromPath = normalizePathname(location.pathname);
			const toPath = normalizePathname(toUrl.pathname);

			const fromDetail = isProjectDetailPathname(fromPath);
			const toDetail = isProjectDetailPathname(toPath);

			if (fromDetail && toDetail) return;
			if (fromDetail && !toDetail) {
				sessionStorage.setItem(ROUTE_ENTER_STORAGE_KEY, "from-project");
				sessionStorage.removeItem(PROJECT_INTER_NAV_STORAGE_KEY);
				sessionStorage.removeItem(PROJECT_INTER_NAV_DIR_KEY);
				return;
			}
			if (!fromDetail && toDetail) {
				sessionStorage.setItem(ROUTE_ENTER_STORAGE_KEY, "from-home");
				sessionStorage.removeItem(PROJECT_INTER_NAV_STORAGE_KEY);
				sessionStorage.removeItem(PROJECT_INTER_NAV_DIR_KEY);
			}
		},
		{ capture: true, signal: ac.signal },
	);
}
