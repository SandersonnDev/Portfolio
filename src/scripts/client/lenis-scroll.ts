import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./register-gsap";
import { reduce } from "./env";

let lenis: Lenis | null = null;
let tickerRaf: ((time: number) => void) | null = null;

/** Valeurs par défaut GSAP `lagSmoothing` (rétablies à la destruction de Lenis). */
const GSAP_LAG_SMOOTHING_DEFAULT: [number, number] = [500, 33];
let lenisTickerActive = false;

export function getLenis(): Lenis | null {
	return lenis;
}

export function killLenisScroll() {
	if (tickerRaf) {
		gsap.ticker.remove(tickerRaf);
		tickerRaf = null;
	}
	if (lenis) {
		lenis.destroy();
		lenis = null;
	}
	if (lenisTickerActive) {
		gsap.ticker.lagSmoothing(GSAP_LAG_SMOOTHING_DEFAULT[0], GSAP_LAG_SMOOTHING_DEFAULT[1]);
		lenisTickerActive = false;
	}
}

/**
 * Défilement vertical amorti (effet « glace ») + synchro ScrollTrigger.
 * Désactivé si `prefers-reduced-motion: reduce`.
 */
export function initLenisScroll() {
	killLenisScroll();
	if (reduce()) return;

	lenis = new Lenis({
		orientation: "vertical",
		gestureOrientation: "vertical",
		smoothWheel: true,
		/** Plus bas = inertie plus longue après lâcher la molette. */
		lerp: 0.048,
		wheelMultiplier: 0.88,
		touchMultiplier: 1,
	});

	lenis.on("scroll", ScrollTrigger.update);

	tickerRaf = (time: number) => {
		lenis?.raf(time * 1000);
	};
	lenisTickerActive = true;
	gsap.ticker.lagSmoothing(0);
	gsap.ticker.add(tickerRaf);

	requestAnimationFrame(() => {
		lenis?.resize();
		ScrollTrigger.refresh();
	});
}
