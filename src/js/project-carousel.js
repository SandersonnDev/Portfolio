const carouselRootsInitialized = new WeakSet();

/**
 * Centre la slide courante dans le track horizontal uniquement.
 * Ne pas utiliser scrollIntoView() : il fait aussi défiler la fenêtre (block),
 * ce qui annule le retour en haut après une transition Astro.
 */
function scrollCurrentIntoView(track) {
	if (!track) return;
	const current = track.querySelector("[data-carousel-current]");
	if (!current) return;
	requestAnimationFrame(() => {
		const max = Math.max(0, track.scrollWidth - track.clientWidth);
		if (max < 1) return;
		const centerSlide = current.offsetLeft + current.offsetWidth / 2;
		const centerViewport = track.clientWidth / 2;
		const left = Math.round(centerSlide - centerViewport);
		track.scrollTo({ left: Math.max(0, Math.min(left, max)), behavior: "auto" });
	});
}

function initCarousel(root) {
	const track = root.querySelector("[data-carousel-track]");
	const prev = root.querySelector("[data-carousel-prev]");
	const next = root.querySelector("[data-carousel-next]");
	if (!track) return;

	if (carouselRootsInitialized.has(root)) {
		scrollCurrentIntoView(track);
		return;
	}
	carouselRootsInitialized.add(root);

	const scrollStep = () => Math.max(track.clientWidth * 0.75, 280);

	prev?.addEventListener("click", () => {
		track.scrollBy({ left: -scrollStep(), behavior: "smooth" });
	});
	next?.addEventListener("click", () => {
		track.scrollBy({ left: scrollStep(), behavior: "smooth" });
	});

	function normalizeWheelDeltaY(e) {
		let dy = e.deltaY;
		if (e.deltaMode === 1) dy *= 16;
		if (e.deltaMode === 2) dy *= track.clientHeight || 100;
		return dy;
	}

	/** Essaie scrollLeft += d depuis `from`, retourne le delta réellement appliqué par le moteur. */
	function peekScrollDelta(from, d) {
		track.scrollLeft = from + d;
		const applied = track.scrollLeft - from;
		track.scrollLeft = from;
		return applied;
	}

	/*
	 * Molette au-dessus du carrousel : priorité au défilement horizontal tant qu’il reste du parcours.
	 * Si le pas est trop petit pour bouger (arrondi / trackpad), on applique un petit coup de pouce pour ne pas laisser la page voler le scroll.
	 */
	function onWheel(e) {
		if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

		const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
		if (maxScroll < 1) return;

		const dy = normalizeWheelDeltaY(e);
		if (dy === 0) return;

		const before = track.scrollLeft;
		const sign = Math.sign(dy);
		const atStart = before <= 0.5;
		const atEnd = before >= maxScroll - 0.5;

		if (sign < 0 && atStart) return;
		if (sign > 0 && atEnd) return;

		let applied = peekScrollDelta(before, dy);
		if (applied === 0) {
			const nudge = sign * Math.max(48, Math.min(120, Math.abs(dy) || 48));
			applied = peekScrollDelta(before, nudge);
		}

		if (applied === 0) return;

		e.preventDefault();
		e.stopPropagation();
		track.scrollLeft = before + applied;
	}

	/* Capture sur le conteneur : cartes + lien pleine largeur restent sous le même arbre. */
	root.addEventListener("wheel", onWheel, { passive: false, capture: true });

	scrollCurrentIntoView(track);
}

function initAll() {
	document.querySelectorAll("[data-project-carousel]").forEach(initCarousel);
}

if (!window.__portfolioProjectCarouselBound) {
	window.__portfolioProjectCarouselBound = true;
	document.addEventListener("astro:page-load", initAll);
}

initAll();
