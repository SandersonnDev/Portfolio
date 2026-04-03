const STORAGE_KEY = "portfolio-theme";

function applyTheme(mode) {
	const root = document.documentElement;
	if (mode === "light") {
		root.classList.remove("dark");
		root.classList.add("light");
	} else {
		root.classList.add("dark");
		root.classList.remove("light");
	}
	try {
		localStorage.setItem(STORAGE_KEY, mode);
	} catch {
		/* ignore */
	}
}

/** Réapplique le thème depuis le stockage (après swap SPA : les attributs de <html> sont écrasés). */
function applyThemeFromStorage() {
	try {
		const t = localStorage.getItem(STORAGE_KEY);
		applyTheme(t === "light" ? "light" : "dark");
	} catch {
		applyTheme("dark");
	}
	syncToggleUi();
}

function syncToggleUi() {
	const isLight = document.documentElement.classList.contains("light");
	const iconClass = isLight ? "fa-solid fa-sun text-base" : "fa-solid fa-moon text-base";
	const iconClassMenu = isLight ? "fa-solid fa-sun text-lg" : "fa-solid fa-moon text-lg";

	document.querySelectorAll("#theme-toggle [data-theme-icon]").forEach((el) => {
		el.className = iconClass;
	});
	document.querySelectorAll("#theme-toggle-menu [data-theme-icon]").forEach((el) => {
		el.className = iconClassMenu;
	});

	document.querySelectorAll("#theme-toggle, #theme-toggle-menu").forEach((btn) => {
		btn.setAttribute("aria-pressed", isLight ? "true" : "false");
		btn.setAttribute("aria-label", isLight ? "Passer en thème sombre" : "Passer en thème clair");
	});
}

if (!window.__portfolioThemeDelegation) {
	window.__portfolioThemeDelegation = true;
	document.addEventListener("click", (e) => {
		const btn = e.target.closest("#theme-toggle, #theme-toggle-menu");
		if (!btn) return;
		e.preventDefault();
		const light = document.documentElement.classList.contains("light");
		applyTheme(light ? "dark" : "light");
		syncToggleUi();
	});
}

document.addEventListener("astro:page-load", applyThemeFromStorage);
document.addEventListener("astro:after-swap", applyThemeFromStorage);
applyThemeFromStorage();
