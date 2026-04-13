import { gsap, ScrollTrigger } from "./register-gsap";
import { reduce } from "./env";

const stackTagChipTweens: gsap.core.Tween[] = [];

export function killStackTagChipsFx() {
	for (const tw of stackTagChipTweens) {
		tw.scrollTrigger?.kill(false);
		tw.kill();
	}
	stackTagChipTweens.length = 0;
}

export function initStackTagChips() {
	killStackTagChipsFx();

	const roots = [
		document.getElementById("about-stack-tags"),
		document.getElementById("project-stack-tags"),
	].filter((n): n is HTMLElement => !!n);

	if (!roots.length || reduce()) return;

	const run = () => {
		for (const root of roots) {
			const chips = [...root.querySelectorAll<HTMLElement>(".chip")];
			if (!chips.length) continue;
			const tw = gsap.from(chips, {
				y: -100,
				opacity: 0,
				rotation: "random(-80, 80)",
				stagger: 0.1,
				duration: 1,
				ease: "back",
				scrollTrigger: {
					trigger: root,
					start: "top 88%",
					once: true,
				},
			});
			stackTagChipTweens.push(tw);
		}
		ScrollTrigger.refresh();
	};

	void document.fonts.ready.then(run);
}
