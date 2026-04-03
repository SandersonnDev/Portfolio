const MENU_OPEN_CLASS = "menu-open";
const MENU_CLOSED_CLASS = "menu-closed";

function setOpen(open) {
	const menuBtn = document.getElementById("menu-btn");
	const menu = document.getElementById("menu");
	if (!menuBtn || !menu) return;
	menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
	menu.classList.toggle(MENU_OPEN_CLASS, open);
	menu.classList.toggle(MENU_CLOSED_CLASS, !open);
	document.body.classList.toggle("overflow-hidden", open);
}

function syncMenuAttributes() {
	const menuBtn = document.getElementById("menu-btn");
	const menu = document.getElementById("menu");
	if (!menuBtn || !menu) return;
	menuBtn.setAttribute("aria-controls", "menu");
	menu.setAttribute("role", "dialog");
	menu.setAttribute("aria-modal", "true");
	menu.setAttribute("aria-label", "Navigation");
	menu.classList.add(MENU_CLOSED_CLASS);
	menu.classList.remove(MENU_OPEN_CLASS);
	menuBtn.setAttribute("aria-expanded", "false");
}

function initBurgerNav() {
	if (window.__portfolioBurgerNav) return;
	window.__portfolioBurgerNav = true;

	document.addEventListener("click", (e) => {
		const menuBtn = e.target.closest("#menu-btn");
		const closeBtn = e.target.closest("[data-close-menu]");
		const menu = document.getElementById("menu");
		if (!menu) return;

		if (menuBtn) {
			e.preventDefault();
			const open = menuBtn.getAttribute("aria-expanded") === "true";
			setOpen(!open);
			return;
		}

		if (closeBtn) {
			e.preventDefault();
			setOpen(false);
			return;
		}

		const link = e.target.closest("#menu a");
		if (link) {
			setOpen(false);
		}
	});

	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") setOpen(false);
	});
}

syncMenuAttributes();
initBurgerNav();
document.addEventListener("astro:page-load", () => {
	syncMenuAttributes();
	setOpen(false);
});
