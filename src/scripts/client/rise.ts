import { gsap, ScrollTrigger } from "./register-gsap";
import { reduce } from "./env";

const riseScrollTriggers: ScrollTrigger[] = [];

function parseRiseDelaySec(el: HTMLElement): number {
	const raw = getComputedStyle(el).getPropertyValue("--rise-delay").trim();
	const m = /^([\d.]+)ms$/.exec(raw);
	return m ? parseFloat(m[1]) / 1000 : 0;
}

export function killRiseScrollTriggers() {
	for (const st of riseScrollTriggers) st.kill();
	riseScrollTriggers.length = 0;
}

export function initRise() {
	killRiseScrollTriggers();

	if (reduce()) {
		document.querySelectorAll("[data-rise]").forEach((n) => n.classList.add("is-visible"));
		ScrollTrigger.refresh();
		return;
	}

	const els = [...document.querySelectorAll<HTMLElement>("[data-rise]")];
	for (const el of els) {
		const isCard = el.classList.contains("project-card");
		const delay = parseRiseDelaySec(el);

		gsap.set(el, {
			autoAlpha: 0,
			y: isCard ? 52 : 36,
			filter: isCard ? "saturate(0.78) brightness(0.92)" : "saturate(0.88)",
			...(isCard ? { boxShadow: "0 0 0 0 rgba(0,0,0,0)" } : {}),
		});

		const st = ScrollTrigger.create({
			trigger: el,
			start: "top 88%",
			once: true,
			onEnter: () => {
				el.classList.add("is-visible");
				const vars: gsap.TweenVars = {
					autoAlpha: 1,
					y: 0,
					filter: "saturate(1) brightness(1)",
					duration: isCard ? 1.08 : 0.95,
					delay,
					ease: "power3.out",
					overwrite: "auto",
				};
				if (isCard) {
					vars.boxShadow =
						"0 18px 48px -28px color-mix(in srgb, var(--accent) 22%, transparent)";
				}
				gsap.to(el, vars);
			},
		});
		riseScrollTriggers.push(st);
	}

	ScrollTrigger.refresh();
}
