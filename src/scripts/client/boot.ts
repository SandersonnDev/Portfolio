import "./register-gsap";
import { ScrollTrigger } from "./register-gsap";
import { killStackTagChipsFx, initStackTagChips } from "./stack-chips";
import { initThemeToggle } from "./theme-toggle";

let cleanupBoot: (() => void) | null = null;

export function boot() {
	cleanupBoot?.();

	killStackTagChipsFx();

	const ac = new AbortController();
	cleanupBoot = () => {
		ac.abort();
		killStackTagChipsFx();
	};

	initThemeToggle(ac.signal);
	initStackTagChips();

	requestAnimationFrame(() => {
		ScrollTrigger.refresh();
	});
}
