import { gsap } from "./register-gsap";
import { reduce } from "./env";
import {
	PROJECT_INTER_NAV_DIR_KEY,
	PROJECT_INTER_NAV_STORAGE_KEY,
} from "./transition-nav";

/**
 * Entrée page fiche : stagger nav (après saut précédent / suivant entre fiches).
 * Appelé depuis `boot()` à chaque chargement pleine page (plus de View Transitions SPA).
 */
export function runProjectArticleEnter() {
	if (reduce()) {
		sessionStorage.removeItem(PROJECT_INTER_NAV_STORAGE_KEY);
		sessionStorage.removeItem(PROJECT_INTER_NAV_DIR_KEY);
		return;
	}

	const inter = sessionStorage.getItem(PROJECT_INTER_NAV_STORAGE_KEY) === "1";
	const dirRaw = sessionStorage.getItem(PROJECT_INTER_NAV_DIR_KEY);
	sessionStorage.removeItem(PROJECT_INTER_NAV_STORAGE_KEY);
	sessionStorage.removeItem(PROJECT_INTER_NAV_DIR_KEY);

	const dir = dirRaw === "prev" || dirRaw === "next" ? dirRaw : null;

	const article = document.querySelector<HTMLElement>("article.project-page");
	if (!article || !inter) return;

	const back = document.querySelector<HTMLElement>(".project-page__back");
	const jump = document.querySelector<HTMLElement>(".project-page__jump");
	const bottomNav = document.querySelector<HTMLElement>(".project-article-nav");
	const targets = [back, jump, bottomNav].filter(Boolean);
	if (!targets.length) return;

	gsap.from(targets, {
		opacity: 0,
		y: 10,
		duration: 0.38,
		stagger: 0.05,
		ease: "sine.out",
		delay: dir ? 0.18 : 0.06,
	});
}
