const LB_ID = "portfolio-lightbox";

function ensureLightbox() {
	let root = document.getElementById(LB_ID);
	if (root) return root;

	root = document.createElement("div");
	root.id = LB_ID;
	root.className = "lightbox-root";
	root.setAttribute("role", "dialog");
	root.setAttribute("aria-modal", "true");
	root.setAttribute("aria-label", "Image agrandie");
	root.innerHTML = `
		<div class="lightbox-backdrop" data-lightbox-close></div>
		<div class="lightbox-inner">
			<button type="button" class="lightbox-close" data-lightbox-close aria-label="Fermer">
				<i class="fa-solid fa-xmark" aria-hidden="true"></i>
			</button>
			<img class="lightbox-img" alt="" />
		</div>
	`;
	document.body.appendChild(root);

	const close = () => {
		root.classList.remove("is-open");
		document.body.classList.remove("overflow-hidden");
	};

	root.querySelectorAll("[data-lightbox-close]").forEach((n) => {
		n.addEventListener("click", close);
	});

	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && root.classList.contains("is-open")) close();
	});

	return root;
}

function openLightbox(src, alt) {
	if (!src) return;
	const root = ensureLightbox();
	const img = root.querySelector(".lightbox-img");
	img.src = src;
	img.alt = alt || "";
	root.classList.add("is-open");
	document.body.classList.add("overflow-hidden");
}

function onDocClick(e) {
	const btn = e.target.closest("[data-lightbox-open]");
	if (!btn) return;
	const src = btn.getAttribute("data-lightbox-src");
	const alt = btn.getAttribute("data-lightbox-alt") || "";
	e.preventDefault();
	openLightbox(src, alt);
}

if (!window.__portfolioLightboxDelegation) {
	window.__portfolioLightboxDelegation = true;
	document.addEventListener("click", onDocClick);
}

document.addEventListener("astro:page-load", () => {
	document.getElementById(LB_ID)?.remove();
});
