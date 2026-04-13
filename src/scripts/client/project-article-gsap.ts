import {
	PROJECT_INTER_NAV_DIR_KEY,
	PROJECT_INTER_NAV_STORAGE_KEY,
} from "./transition-nav";

/**
 * Fin de séquence MPA fiche projet : nettoie les marqueurs session (prev/next entre fiches).
 * L’ancienne entrée GSAP sur la nav (fondu + stagger) a été retirée pour éviter l’effet
 * « actualisation » visuel à chaque saut entre fiches.
 */
export function runProjectArticleEnter() {
	sessionStorage.removeItem(PROJECT_INTER_NAV_STORAGE_KEY);
	sessionStorage.removeItem(PROJECT_INTER_NAV_DIR_KEY);
}
