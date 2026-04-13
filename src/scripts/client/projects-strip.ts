import { gsap } from "./register-gsap";
import { reduce } from "./env";

let projectsStripTL: gsap.core.Timeline | null = null;

export function killProjectsHorizontalScroll() {
	projectsStripTL?.scrollTrigger?.kill();
	projectsStripTL?.kill();
	projectsStripTL = null;
	const track = document.querySelector<HTMLElement>("[data-projects-track]");
	if (track) gsap.set(track, { clearProps: "x" });
}

/**
 * Défilement vertical pendant le pin :
 * 1) phase « centrage » : piste immobile (x = 0), la grille peut se lire au milieu du viewport ;
 * 2) phase horizontale : translation du track.
 */
export function initProjectsHorizontalScroll() {
	killProjectsHorizontalScroll();

	const section = document.getElementById("projects");
	if (!section || reduce()) return;

	const pinEl = section.querySelector<HTMLElement>("[data-projects-pin]");
	const viewport = section.querySelector<HTMLElement>("[data-projects-viewport]");
	const track = section.querySelector<HTMLElement>("[data-projects-track]");
	if (!pinEl || !viewport || !track) return;

	const overflowPx = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
	if (overflowPx() <= 2) return;

	/** Distance de scroll (px) sans bouger le carrousel — lecture centrée. */
	const centerPhaseScrollPx = () =>
		Math.min(Math.round(window.innerHeight * 0.3), 340);

	const tl = gsap.timeline({
		scrollTrigger: {
			trigger: pinEl,
			start: "top top",
			end: () => `+=${centerPhaseScrollPx() + Math.ceil(overflowPx())}`,
			pin: true,
			pinType: "transform",
			scrub: true,
			invalidateOnRefresh: true,
			anticipatePin: 1,
		},
	});

	const hold = centerPhaseScrollPx();
	const move = Math.ceil(overflowPx());

	tl.to(track, { x: 0, duration: hold, ease: "none" }).to(track, {
		x: () => Math.min(0, viewport.clientWidth - track.scrollWidth),
		duration: move,
		ease: "none",
	});

	projectsStripTL = tl;
}
