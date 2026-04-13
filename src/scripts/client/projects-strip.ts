import { gsap, ScrollTrigger } from "./register-gsap";
import { reduce } from "./env";

let projectsStripTL: gsap.core.Timeline | null = null;
let projectsStripRefreshInit: (() => void) | null = null;

function clearProjectsScrollPad() {
	const pad = document.querySelector<HTMLElement>("[data-projects-scroll-pad]");
	if (pad) pad.style.width = "";
}

/** Sur grands écrans la piste tient sans débordement : on élargit le spacer pour garder un vrai scrub horizontal + pin. */
function syncProjectsStripScrollPad(
	viewport: HTMLElement,
	track: HTMLElement,
	padEl: HTMLElement | null,
): number {
	if (padEl) padEl.style.width = "";
	void track.offsetWidth;

	let overflow = Math.max(0, track.scrollWidth - viewport.clientWidth);
	const minMovePx = Math.max(520, Math.round(viewport.clientWidth * 0.28));

	if (overflow >= minMovePx || !padEl) return overflow;

	const extra = minMovePx - overflow;
	const basePad = padEl.getBoundingClientRect().width;
	padEl.style.width = `${basePad + extra}px`;
	void track.offsetWidth;

	return Math.max(0, track.scrollWidth - viewport.clientWidth);
}

export function killProjectsHorizontalScroll() {
	projectsStripTL?.scrollTrigger?.kill();
	projectsStripTL?.kill();
	projectsStripTL = null;
	if (projectsStripRefreshInit) {
		ScrollTrigger.removeEventListener("refreshInit", projectsStripRefreshInit);
		projectsStripRefreshInit = null;
	}
	clearProjectsScrollPad();
	const track = document.querySelector<HTMLElement>("[data-projects-track]");
	if (track) gsap.set(track, { clearProps: "x" });
}

/**
 * Défilement vertical pendant le pin :
 * 1) phase « centrage » : piste immobile (x = 0) ;
 * 2) phase horizontale : translation du track ;
 * 3) phase « verrou fin » : x inchangé mais scroll vertical prolongé (moins de lâcher brutal en fin de strip).
 */
export function initProjectsHorizontalScroll() {
	killProjectsHorizontalScroll();

	const section = document.getElementById("projects");
	if (!section || reduce()) return;

	const pinEl = section.querySelector<HTMLElement>("[data-projects-pin]");
	const viewport = section.querySelector<HTMLElement>("[data-projects-viewport]");
	const track = section.querySelector<HTMLElement>("[data-projects-track]");
	const scrollPad = section.querySelector<HTMLElement>("[data-projects-scroll-pad]");
	if (!pinEl || !viewport || !track) return;

	syncProjectsStripScrollPad(viewport, track, scrollPad);

	const overflowPx = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
	if (overflowPx() <= 2) return;

	/** Distance de scroll (px) sans bouger le carrousel — lecture centrée. */
	const centerPhaseScrollPx = () =>
		Math.min(Math.round(window.innerHeight * 0.3), 340);

	/** Scroll vertical supplémentaire une fois le carrousel tout à droite : évite de « lâcher » trop vite la section. */
	const endLockScrollPx = () =>
		Math.min(380, Math.max(220, Math.round(window.innerHeight * 0.26)));

	const tl = gsap.timeline({
		scrollTrigger: {
			trigger: pinEl,
			start: "top top",
			end: () =>
				`+=${centerPhaseScrollPx() + Math.ceil(overflowPx()) + endLockScrollPx()}`,
			pin: true,
			/* "transform" provoquait du jitter Y (titre + cartes) à chaque cran de molette ; fixed est plus stable. */
			pinType: "fixed",
			scrub: true,
			invalidateOnRefresh: true,
			anticipatePin: 0,
		},
	});

	const xEnd = () => Math.min(0, viewport.clientWidth - track.scrollWidth);

	tl.to(track, {
		x: 0,
		duration: () => centerPhaseScrollPx(),
		ease: "none",
	})
		.to(track, {
			x: xEnd,
			duration: () => Math.ceil(overflowPx()),
			ease: "none",
		})
		.to(track, {
			x: xEnd,
			duration: () => endLockScrollPx(),
			ease: "none",
		});

	projectsStripTL = tl;

	const onRefreshInit = () => {
		if (!projectsStripTL) return;
		syncProjectsStripScrollPad(viewport, track, scrollPad);
	};
	projectsStripRefreshInit = onRefreshInit;
	ScrollTrigger.addEventListener("refreshInit", onRefreshInit);
}
