import { reduce } from "./env";

const STORAGE_KEY = "portfolio-theme:v1";

export type Theme = "dark" | "light";

type DocumentWithViewTransition = Document & {
	startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

export function getTheme(): Theme {
	const a = document.documentElement.getAttribute("data-theme");
	if (a === "light" || a === "dark")
		return a;
	return "dark";
}

function syncThemeToggleButton(): void {
	const btn = document.getElementById("rail-theme-toggle");
	if (!btn)
		return;
	const toLight = btn.getAttribute("data-label-to-light") ?? "";
	const toDark = btn.getAttribute("data-label-to-dark") ?? "";
	const icon = btn.querySelector<HTMLElement>(".rail__theme-icon");
	const t = getTheme();
	if (t === "light") {
		btn.title = toDark;
		btn.setAttribute("aria-label", toDark);
		icon?.classList.remove("fa-sun");
		icon?.classList.add("fa-moon");
	}
	else {
		btn.title = toLight;
		btn.setAttribute("aria-label", toLight);
		icon?.classList.remove("fa-moon");
		icon?.classList.add("fa-sun");
	}
}

export function setTheme(theme: Theme): void {
	const apply = () => {
		document.documentElement.setAttribute("data-theme", theme);
		try {
			localStorage.setItem(STORAGE_KEY, theme);
		}
		catch {
			/* private mode, quota */
		}
		syncThemeToggleButton();
	};

	if (!reduce()) {
		const d = document as DocumentWithViewTransition;
		if (typeof d.startViewTransition === "function")
			d.startViewTransition(apply);
		else
			apply();
	}
	else {
		apply();
	}
}

export function initThemeToggle(signal: AbortSignal): void {
	syncThemeToggleButton();
	const btn = document.getElementById("rail-theme-toggle");
	if (!btn)
		return;
	btn.addEventListener(
		"click",
		() => {
			setTheme(getTheme() === "dark" ? "light" : "dark");
		},
		{ signal },
	);
}
