import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./register-gsap";
import { reduce } from "./env";

let lenis: Lenis | null = null;
let tickerRaf: ((time: number) => void) | null = null;
let scrollTriggerProxyAttached = false;

/** Valeurs par défaut GSAP `lagSmoothing` (rétablies à la destruction de Lenis). */
const GSAP_LAG_SMOOTHING_DEFAULT: [number, number] = [500, 33];
let lenisTickerActive = false;

function attachScrollTriggerScrollerProxy(): void {
	if (scrollTriggerProxyAttached || !lenis || typeof document === "undefined")
		return;
	const root = document.documentElement;
	ScrollTrigger.scrollerProxy(root, {
		scrollTop(value) {
			if (!lenis) {
				if (arguments.length)
					window.scrollTo(0, Number(value));
				return window.scrollY || document.documentElement.scrollTop;
			}
			if (arguments.length)
				lenis.scrollTo(Number(value), { immediate: true });
			return lenis.scroll;
		},
		getBoundingClientRect() {
			return {
				top: 0,
				left: 0,
				width: window.innerWidth,
				height: window.innerHeight,
			};
		},
	});
	scrollTriggerProxyAttached = true;
}

function detachScrollTriggerScrollerProxy(): void {
	if (!scrollTriggerProxyAttached || typeof document === "undefined")
		return;
	ScrollTrigger.scrollerProxy(document.documentElement);
	scrollTriggerProxyAttached = false;
}

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
	detachScrollTriggerScrollerProxy();
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
		/** Un peu plus haut qu’avant : moins d’oscillation quand la molette change de sens vite (pages longues + ScrollTrigger). */
		lerp: 0.085,
		wheelMultiplier: 1,
		touchMultiplier: 1,
	});

	attachScrollTriggerScrollerProxy();
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
