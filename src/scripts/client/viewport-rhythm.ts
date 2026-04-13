import { ScrollTrigger } from "./register-gsap";

/**
 * Avant : ajustait `--fluid-type` sur `<html>` au chargement → `font-size` en `rem` changeait
 * juste après le premier rendu (effet zoom / dézoom à chaque reload ou navigation pleine page).
 * Désormais : uniquement rafraîchir ScrollTrigger au resize ; le `rem` reste piloté par le CSS (`--fluid-type: 1`).
 */
export function initViewportRhythm(signal: AbortSignal): void {
	const onResize = () => {
		ScrollTrigger.refresh();
	};

	window.addEventListener("resize", onResize, { passive: true, signal });
}
