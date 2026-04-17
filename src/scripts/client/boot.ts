import "./register-gsap";
import { gsap, ScrollTrigger } from "./register-gsap";
import { clearLayeredScrollArtifacts } from "./layered-scroll";
import { initProjectDetailNavTransitionDirection, initRouteEnterMarkers } from "./transition-nav";
import { runPageEnterTransitions } from "./page-transitions";
import {
	initGlobalPointer,
	initParallax,
	initSysClock,
	initSmoothNav,
	initCursor,
	killSysClock,
} from "./global-input";
import { killRiseScrollTriggers, initRise } from "./rise";
import { killProjectsHorizontalScroll, initProjectsHorizontalScroll } from "./projects-strip";
import { killStackTagChipsFx, initStackTagChips } from "./stack-chips";
import { killProjectLineReveal, initProjectReadmeLineReveal } from "./project-readme";
import { disconnectTextFX, initTextFX } from "./text-fx";
import { initViewportRhythm } from "./viewport-rhythm";
import { initLenisScroll, killLenisScroll } from "./lenis-scroll";
import { registerScrollPositionSave, restoreScrollPositionAfterBoot } from "./scroll-restore";
import { initThemeToggle } from "./theme-toggle";

let cleanupBoot: (() => void) | null = null;

export function boot() {
	cleanupBoot?.();

	registerScrollPositionSave();

	killSysClock();
	gsap.killTweensOf(window);
	clearLayeredScrollArtifacts();
	killRiseScrollTriggers();
	killProjectsHorizontalScroll();
	killStackTagChipsFx();
	killProjectLineReveal();
	disconnectTextFX();

	const ac = new AbortController();
	cleanupBoot = () => {
		gsap.killTweensOf(window);
		ac.abort();
		killSysClock();
		clearLayeredScrollArtifacts();
		killLenisScroll();
		killRiseScrollTriggers();
		killProjectsHorizontalScroll();
		killStackTagChipsFx();
		killProjectLineReveal();
		disconnectTextFX();
		document.body.classList.remove("has-custom-cursor", "cursor-hover");
	};

	initGlobalPointer(ac);
	initThemeToggle(ac.signal);
	initLenisScroll();
	restoreScrollPositionAfterBoot();
	initProjectDetailNavTransitionDirection(ac);
	initRouteEnterMarkers(ac);
	initSmoothNav(ac);
	initParallax(ac);
	initSysClock();
	initRise();
	initProjectsHorizontalScroll();
	initStackTagChips();

	if (document.querySelector(".project-page")) {
		initProjectReadmeLineReveal(ac);
	}

	initTextFX(ac);
	initCursor(ac);
	initViewportRhythm(ac.signal);

	requestAnimationFrame(() => {
		ScrollTrigger.refresh();
		void document.fonts.ready.then(async () => {
			if (!document.querySelector(".readme-mermaid.mermaid")) return;
			const { initReadmeMermaid } = await import("./mermaid-init");
			await initReadmeMermaid();
		});
	});

	/* Slide journal (prev/next) + fondu accueil ↔ fiche (voir transition-nav + Layout inline). */
	runPageEnterTransitions();
}
