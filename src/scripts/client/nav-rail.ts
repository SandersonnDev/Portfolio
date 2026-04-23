import { gsap } from "./register-gsap";
import { ScrollTrigger } from "./register-gsap";
import { reduce } from "./env";

const SECTION_ORDER = ["home", "about", "work", "contact"] as const;

let activeScrollTween: gsap.core.Tween | null = null;
let navCtx: gsap.Context | null = null;
const disposers: (() => void)[] = [];

function setActiveLink(links: HTMLAnchorElement[], id: string) {
	for (const a of links) {
		if (a.dataset.navHash === id) {
			a.classList.add("is-active");
			a.setAttribute("aria-current", "true");
		} else {
			a.classList.remove("is-active");
			a.removeAttribute("aria-current");
		}
	}
}

function replaceUrlFromLink(a: HTMLAnchorElement) {
	try {
		const u = new URL(a.href);
		history.replaceState(null, "", `${u.pathname}${u.search}${u.hash}`);
	} catch {
		history.replaceState(null, "", a.getAttribute("href") ?? "#");
	}
}

function scrollYToElement(el: HTMLElement) {
	return el.getBoundingClientRect().top + window.scrollY;
}

export function killNavRail() {
	activeScrollTween?.kill();
	activeScrollTween = null;
	navCtx?.revert();
	navCtx = null;
	for (const d of disposers.splice(0)) d();
}

export function initNavRail() {
	killNavRail();

	const nav = document.getElementById("nav-rail");
	if (!nav) return;

	const links = Array.from(nav.querySelectorAll("a[data-nav-hash]")).filter(
		(el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement,
	);
	const valid = new Set<string>(SECTION_ORDER);

	function idFromHash() {
		let h = (window.location.hash || "#home").replace(/^#/, "").toLowerCase();
		if (!valid.has(h)) h = "home";
		return h;
	}

	function syncFromHash() {
		setActiveLink(links, idFromHash());
	}

	const onHashChange = () => syncFromHash();
	window.addEventListener("hashchange", onHashChange);
	disposers.push(() => window.removeEventListener("hashchange", onHashChange));

	navCtx = gsap.context(() => {
		for (const id of SECTION_ORDER) {
			const el = document.getElementById(id);
			if (!(el instanceof HTMLElement)) continue;
			ScrollTrigger.create({
				trigger: el,
				start: "top center",
				end: "bottom center",
				onToggle: (self) => {
					if (!self.isActive) return;
					setActiveLink(links, id);
				},
			});
		}
	});

	const onNavClick = (e: MouseEvent) => {
		const t = (e.target as Element | null)?.closest?.("a[data-nav-hash]");
		if (!(t instanceof HTMLAnchorElement)) return;
		const raw = t.getAttribute("href")?.split("#")[1];
		if (!raw) return;
		const id = raw.toLowerCase();
		if (!valid.has(id)) return;
		const target = document.getElementById(id);
		if (!(target instanceof HTMLElement)) return;

		e.preventDefault();
		const y = scrollYToElement(target);
		const instant = reduce();
		activeScrollTween?.kill();
		const proxy = { y: window.scrollY };
		activeScrollTween = gsap.to(proxy, {
			y,
			duration: instant ? 0.05 : 1.05,
			ease: "power2.inOut",
			overwrite: true,
			onUpdate: () => {
				window.scrollTo(0, proxy.y);
			},
			onComplete: () => {
				activeScrollTween = null;
				setActiveLink(links, id);
				replaceUrlFromLink(t);
				ScrollTrigger.refresh();
			},
		});
	};
	nav.addEventListener("click", onNavClick);
	disposers.push(() => nav.removeEventListener("click", onNavClick));

	syncFromHash();
	requestAnimationFrame(() => {
		ScrollTrigger.refresh();
	});
}
