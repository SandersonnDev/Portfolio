/** Retire résidus éventuels (HMR / anciens effets scroll) sur les sections plein écran. */
export function clearLayeredScrollArtifacts() {
	document.documentElement.classList.remove("gsap-layered-scroll");
	document.querySelectorAll<HTMLElement>("main > section.section-viewport").forEach((el) => {
		el.style.removeProperty("z-index");
	});
}
