import { gsap, ScrollTrigger } from "./register-gsap";
import { reduce } from "./env";
import { runProjectArticleEnter } from "./project-article-gsap";

const SLIDE_DURATION = 0.42;
const SLIDE_EASE = "power2.out";
const FADE_DURATION = 0.48;
const FADE_EASE = "power2.out";

function clearPageTransitionAttrs() {
	const html = document.documentElement;
	html.removeAttribute("data-page-slide");
	html.removeAttribute("data-route-enter");
}

/**
 * Après navigation MPA : slide du journal (prev/next entre fiches) et/ou fondu accueil ↔ fiche.
 */
export function runPageEnterTransitions() {
	const html = document.documentElement;
	const slideDir = html.getAttribute("data-page-slide");
	const routeEnter = html.getAttribute("data-route-enter");
	const journal = document.querySelector<HTMLElement>(".project-page__journal");
	const mainShift = document.querySelector<HTMLElement>(".main-shift");

	if (reduce()) {
		clearPageTransitionAttrs();
		runProjectArticleEnter();
		return;
	}

	const fadeMain = routeEnter === "from-home" || routeEnter === "from-project";
	/* Ne pas combiner slide journal + fondu accueil : le journal est dans `.main-shift` (masqué pendant le fondu). */
	const journalSlide = Boolean(
		!fadeMain && journal && (slideDir === "prev" || slideDir === "next"),
	);

	const done = () => {
		ScrollTrigger.refresh();
		runProjectArticleEnter();
	};

	if (journalSlide && journal) {
		gsap.to(journal, {
			x: 0,
			duration: SLIDE_DURATION,
			ease: SLIDE_EASE,
			force3D: true,
			clearProps: "transform",
			onComplete: () => {
				html.removeAttribute("data-page-slide");
				html.removeAttribute("data-route-enter");
				done();
			},
		});
		return;
	}

	if (fadeMain && mainShift) {
		gsap.to(mainShift, {
			autoAlpha: 1,
			duration: FADE_DURATION,
			ease: FADE_EASE,
			clearProps: "opacity,visibility",
			onComplete: () => {
				html.removeAttribute("data-route-enter");
				html.removeAttribute("data-page-slide");
				done();
			},
		});
		return;
	}

	clearPageTransitionAttrs();
	runProjectArticleEnter();
}
