import { getLenis } from "./lenis-scroll";
import { ScrollTrigger } from "./register-gsap";

const STORAGE_KEY = "portfolio:scroll-restore:v1";

let saveRegistered = false;

function readScrollY(): number {
	const lenis = getLenis();
	if (lenis) return lenis.scroll;
	return window.scrollY || document.documentElement.scrollTop || 0;
}

/** Sauvegarde la position avant déchargement (F5, navigation pleine page, etc.). */
export function registerScrollPositionSave(): void {
	if (typeof window === "undefined" || saveRegistered) return;
	saveRegistered = true;

	window.addEventListener(
		"pagehide",
		(ev) => {
			if (ev.persisted) return;
			try {
				const path = `${location.pathname}${location.search}`;
				const y = Math.max(0, Math.round(readScrollY()));
				sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ path, y }));
			} catch {
				/* quota / mode privé */
			}
		},
		{ capture: true },
	);
}

function navigationType(): string | undefined {
	try {
		const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
		return nav?.type;
	} catch {
		return undefined;
	}
}

/**
 * Après F5 sur la même URL : restaure le scroll (Lenis ou natif).
 * Ignoré si fragment (#…), autre URL, ou chargement qui n’est pas un reload.
 */
export function restoreScrollPositionAfterBoot(): void {
	if (typeof window === "undefined") return;

	if (location.hash) {
		try {
			sessionStorage.removeItem(STORAGE_KEY);
		} catch {
			/* ignore */
		}
		return;
	}

	if (navigationType() !== "reload") {
		return;
	}

	let raw: string | null = null;
	try {
		raw = sessionStorage.getItem(STORAGE_KEY);
	} catch {
		return;
	}
	if (!raw) return;

	let parsed: { path?: string; y?: number } | null = null;
	try {
		parsed = JSON.parse(raw) as { path?: string; y?: number };
	} catch {
		try {
			sessionStorage.removeItem(STORAGE_KEY);
		} catch {
			/* ignore */
		}
		return;
	}

	const here = `${location.pathname}${location.search}`;
	if (!parsed || parsed.path !== here || typeof parsed.y !== "number") {
		try {
			sessionStorage.removeItem(STORAGE_KEY);
		} catch {
			/* ignore */
		}
		return;
	}

	try {
		sessionStorage.removeItem(STORAGE_KEY);
	} catch {
		/* ignore */
	}

	const y = Math.max(0, parsed.y);
	const lenis = getLenis();

	if (lenis) {
		lenis.scrollTo(y, { immediate: true });
	} else {
		window.scrollTo(0, y);
	}

	requestAnimationFrame(() => {
		ScrollTrigger.refresh();
	});
}
