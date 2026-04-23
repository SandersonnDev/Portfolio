import "./register-gsap";
import { ScrollTrigger } from "./register-gsap";
import { killNavRail, initNavRail } from "./nav-rail";
import { killStackTagChipsFx, initStackTagChips } from "./stack-chips";
import { initLangToggle } from "./lang-toggle";
import { initThemeToggle } from "./theme-toggle";

let cleanupBoot: (() => void) | null = null;

export function boot() {
	cleanupBoot?.();

	killStackTagChipsFx();
	killNavRail();

	const ac = new AbortController();
	cleanupBoot = () => {
		ac.abort();
		killStackTagChipsFx();
		killNavRail();
	};

	initThemeToggle(ac.signal);
	initLangToggle(ac.signal);
	initNavRail();
	initStackTagChips();

	requestAnimationFrame(() => {
		ScrollTrigger.refresh();
	});
}
