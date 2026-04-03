const HEADER_SEL = "[data-site-header]";

function sync() {
	const el = document.querySelector(HEADER_SEL);
	if (!el) return;
	const y = window.scrollY || document.documentElement.scrollTop;
	el.classList.toggle("header-is-scrolled", y > 12);
}

if (!window.__portfolioHeaderScrollBound) {
	window.__portfolioHeaderScrollBound = true;
	window.addEventListener("scroll", sync, { passive: true });
}

sync();
document.addEventListener("astro:page-load", sync);
