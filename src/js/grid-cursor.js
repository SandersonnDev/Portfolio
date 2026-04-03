const root = document.documentElement;

function setPointer(clientX, clientY) {
	root.style.setProperty("--pointer-x", `${clientX}px`);
	root.style.setProperty("--pointer-y", `${clientY}px`);
}

function initGridCursor() {
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (reduced) {
		setPointer(window.innerWidth / 2, window.innerHeight * 0.35);
		return;
	}

	if (!window.__portfolioGridCursorBound) {
		window.__portfolioGridCursorBound = true;
		const sync = (e) => setPointer(e.clientX, e.clientY);
		window.addEventListener("pointermove", sync, { passive: true });
		window.addEventListener("pointerdown", sync, { passive: true });
		window.addEventListener(
			"touchmove",
			(e) => {
				const t = e.touches[0];
				if (t) setPointer(t.clientX, t.clientY);
			},
			{ passive: true }
		);
	}

	setPointer(window.innerWidth / 2, window.innerHeight * 0.35);
}

initGridCursor();
document.addEventListener("astro:page-load", initGridCursor);
