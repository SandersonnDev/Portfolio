/** View Transitions (Astro) : glissement horizontal pleine largeur (forwards = ← / → ; backwards = inverse). */
const ease = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
const duration = "580ms";

export function projectArticleParallax() {
	return {
		forwards: {
			old: {
				name: "projectVtParallaxOld",
				duration,
				easing: ease,
				fillMode: "both" as const,
			},
			new: {
				name: "projectVtParallaxNew",
				duration,
				easing: ease,
				fillMode: "both" as const,
			},
		},
		backwards: {
			old: {
				name: "projectVtParallaxOldBack",
				duration,
				easing: ease,
				fillMode: "both" as const,
			},
			new: {
				name: "projectVtParallaxNewBack",
				duration,
				easing: ease,
				fillMode: "both" as const,
			},
		},
	};
}
