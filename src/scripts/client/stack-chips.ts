import { gsap, ScrollTrigger } from "./register-gsap";
import { reduce } from "./env";

const stackTagChipTweens: gsap.core.Tween[] = [];

/**
 * Entrée tags stack : translation + rotation seulement (pas d’opacity).
 * Les cartes / panneaux About ont déjà `data-rise` en `autoAlpha` sur le parent :
 * animer aussi l’opacity sur les enfants multiplie les alphas → assombrissement / scintillement au refresh.
 */
const stackTagEnterVars = {
	y: -56,
	rotation: "random(-22, 22)" as const,
	stagger: 0.07,
	duration: 0.88,
	ease: "back.out(1.35)" as const,
	immediateRender: false,
	scrollTrigger: {
		start: "top 92%",
		once: true,
		invalidateOnRefresh: true,
	},
};

/** Badges Shields sous `[data-projects-viewport]` (overflow clip) : pas de translation vers le haut sinon rognage. */
const cardBadgeEnterVars = {
	y: 18,
	rotation: "random(-10, 10)" as const,
	stagger: 0.06,
	duration: 0.75,
	ease: "back.out(1.2)" as const,
	immediateRender: false,
	scrollTrigger: {
		start: "top 92%",
		once: true,
		invalidateOnRefresh: true,
	},
};

function clearStackTagGsapArtifacts() {
	const selectors = [
		"#about-stack-tags .chip",
		"#project-stack-tags .chip",
		".project-card__stack-badge",
	];
	for (const sel of selectors) {
		document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
			gsap.killTweensOf(el);
			gsap.set(el, { clearProps: "opacity,visibility,transform,x,y,z,rotation,scale,filter" });
		});
	}
}

export function killStackTagChipsFx() {
	for (const tw of stackTagChipTweens) {
		tw.scrollTrigger?.kill(false);
		tw.kill();
	}
	stackTagChipTweens.length = 0;
	clearStackTagGsapArtifacts();
}

export function initStackTagChips() {
	killStackTagChipsFx();

	const chipRoots = [
		document.getElementById("about-stack-tags"),
		document.getElementById("project-stack-tags"),
	].filter((n): n is HTMLElement => !!n);

	const cardStackRoots = [...document.querySelectorAll<HTMLElement>(".project-card__stack")];

	if ((!chipRoots.length && !cardStackRoots.length) || reduce()) return;

	const run = () => {
		for (const root of chipRoots) {
			const chips = [...root.querySelectorAll<HTMLElement>(".chip")];
			if (!chips.length) continue;
			const tw = gsap.from(chips, {
				...stackTagEnterVars,
				scrollTrigger: {
					...stackTagEnterVars.scrollTrigger,
					trigger: root,
				},
			});
			stackTagChipTweens.push(tw);
		}

		for (const root of cardStackRoots) {
			const badges = [...root.querySelectorAll<HTMLElement>(".project-card__stack-badge")];
			if (!badges.length) continue;
			/* Trigger sur la carte : la stack est en bas, sinon `top 92%` sur le bloc seul ne part pas toujours (strip horizontal, etc.). */
			const triggerEl = root.closest<HTMLElement>(".project-card") ?? root;
			const tw = gsap.from(badges, {
				...cardBadgeEnterVars,
				scrollTrigger: {
					...cardBadgeEnterVars.scrollTrigger,
					trigger: triggerEl,
				},
			});
			stackTagChipTweens.push(tw);
		}

		ScrollTrigger.refresh();
	};

	void document.fonts.ready.then(run);
}
