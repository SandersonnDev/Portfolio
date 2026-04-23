const STORAGE_KEY = "portfolio-theme";

function applyTheme(light: boolean) {
	if (light) document.documentElement.setAttribute("data-theme", "light");
	else document.documentElement.removeAttribute("data-theme");
}

export function initThemeToggle(signal: AbortSignal) {
	const input = document.getElementById("nav-theme-toggle");
	if (!(input instanceof HTMLInputElement)) return;

	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === "light" || stored === "dark") {
		input.checked = stored === "light";
	} else {
		input.checked = matchMedia("(prefers-color-scheme: light)").matches;
	}
	applyTheme(input.checked);

	input.addEventListener(
		"change",
		() => {
			const light = input.checked;
			applyTheme(light);
			localStorage.setItem(STORAGE_KEY, light ? "light" : "dark");
		},
		{ signal },
	);
}
