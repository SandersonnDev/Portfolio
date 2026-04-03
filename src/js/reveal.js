const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const observers = [];
/** @type {WeakMap<Element, number>} */
const revealTimers = new WeakMap();
/** @type {Set<Element>} */
const pendingRevealEls = new Set();

function disconnectAll() {
	for (const el of [...pendingRevealEls]) {
		cancelRevealTimer(el);
	}
	for (const o of observers) {
		try {
			o.disconnect();
		} catch {
			/* ignore */
		}
	}
	observers.length = 0;
}

function cancelRevealTimer(el) {
	const id = revealTimers.get(el);
	if (id != null) {
		window.clearTimeout(id);
		revealTimers.delete(el);
	}
	pendingRevealEls.delete(el);
}

/** Aligné sur rootMargin `0px 0px -5% 0px` de l’observer. */
function isRevealInView(el) {
	const rect = el.getBoundingClientRect();
	const h = window.innerHeight;
	const bottomInset = h * 0.05;
	return rect.bottom > 0 && rect.top < h - bottomInset;
}

function initReveal() {
	disconnectAll();

	if (prefersReduced) {
		document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
		return;
	}

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const el = entry.target;
				if (!entry.isIntersecting) {
					cancelRevealTimer(el);
					el.classList.remove("is-visible");
					continue;
				}

				const delay = Number.parseInt(el.getAttribute("data-reveal-delay") || "0", 10);

				const show = () => {
					revealTimers.delete(el);
					pendingRevealEls.delete(el);
					if (!isRevealInView(el)) return;
					el.classList.add("is-visible");
				};

				cancelRevealTimer(el);
				if (delay > 0) {
					pendingRevealEls.add(el);
					const id = window.setTimeout(show, delay);
					revealTimers.set(el, id);
				} else {
					show();
				}
			}
		},
		{ root: null, rootMargin: "0px 0px -5% 0px", threshold: [0, 0.08, 0.15] }
	);

	document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
	observers.push(observer);

	initHeroReplay();
}

function initHeroReplay() {
	if (prefersReduced) return;

	const roots = document.querySelectorAll("[data-hero-replay]");
	if (!roots.length) return;

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const bits = entry.target.querySelectorAll(".hero-bit");
				if (!bits.length) continue;
				if (entry.isIntersecting) {
					for (const bit of bits) {
						bit.style.removeProperty("animation");
					}
				} else {
					for (const bit of bits) {
						bit.style.animation = "none";
					}
				}
			}
		},
		{ root: null, rootMargin: "0px 0px -8% 0px", threshold: [0, 0.12] },
	);

	for (const root of roots) {
		observer.observe(root);
	}
	observers.push(observer);
}

initReveal();
document.addEventListener("astro:page-load", initReveal);
