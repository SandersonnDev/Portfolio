import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import SplitType from "split-type";
import { isTransitionBeforePreparationEvent } from "astro:transitions/client";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => matchMedia("(pointer: fine)").matches;

const INTERACT_SEL = "a, button, [role='button'], input, textarea, select, .tile-action";

const GLYPHS =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789█▒░·/&%$#@!?";

let mouseX = 0;
let mouseY = 0;

let mermaidInitialized = false;

let cleanupBoot: (() => void) | null = null;
let sysClockTimer: ReturnType<typeof setInterval> | null = null;
const riseScrollTriggers: ScrollTrigger[] = [];
let projectsHorizontalST: ScrollTrigger | null = null;
const stackTagChipTweens: gsap.core.Tween[] = [];
const projectLineSplitInstances: SplitType[] = [];
const projectLineAnimations: gsap.core.Animation[] = [];
let lineRevealResizeTimer = 0;
let textFxObserver: IntersectionObserver | null = null;
let heroSeqObserver: IntersectionObserver | null = null;
let aboutSeqObserver: IntersectionObserver | null = null;
let heroSequentialStarted = false;
let aboutSequentialStarted = false;

const textFxState = new WeakMap<HTMLElement, { cancel?: () => void }>();

function pickGlyph() {
	return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "·";
}

function runScramble(el: HTMLElement, final: string, onComplete?: () => void, durationOverrideMs?: number) {
	const state = textFxState.get(el) ?? {};
	state.cancel?.();
	let cancelled = false;
	let rafId = 0;
	const cancel = () => {
		cancelled = true;
		cancelAnimationFrame(rafId);
	};
	state.cancel = cancel;
	textFxState.set(el, state);

	const len = final.length;
	const duration =
		durationOverrideMs ?? Math.min(2400, 380 + len * 42);
	const start = performance.now();

	function frame(now: number) {
		if (cancelled) return;
		const t = Math.min(1, (now - start) / duration);
		const ease = 1 - (1 - t) ** 2;
		const reveal = Math.floor(ease * len);
		let out = "";
		for (let i = 0; i < len; i++) {
			const c = final[i] ?? "";
			if (c === "\n" || c === "\r") {
				out += c;
				continue;
			}
			if (i < reveal) out += c;
			else if (c === " ") out += " ";
			else out += pickGlyph();
		}
		el.textContent = out;
		if (t < 1) rafId = requestAnimationFrame(frame);
		else {
			el.textContent = final;
			onComplete?.();
		}
	}
	rafId = requestAnimationFrame(frame);
}

const typewriterCompleted = new WeakSet<HTMLElement>();
/** Évite de marquer le typewriter comme « fini » au premier callback hors viewport (éléments jamais vus, ex. section About). */
const typewriterEverSeen = new WeakSet<HTMLElement>();

function runTypewriter(el: HTMLElement, final: string, speedMs: number, onComplete?: () => void) {
	const state = textFxState.get(el) ?? {};
	state.cancel?.();
	let cancelled = false;
	let timeoutId = 0;
	const cancel = () => {
		cancelled = true;
		if (timeoutId) window.clearTimeout(timeoutId);
	};
	state.cancel = cancel;
	textFxState.set(el, state);

	el.replaceChildren();
	const caret = document.createElement("span");
	caret.className = "tw-caret";
	caret.setAttribute("aria-hidden", "true");

	let i = 0;
	const tick = () => {
		if (cancelled) return;
		el.replaceChildren();
		const slice = final.slice(0, i);
		if (slice) el.appendChild(document.createTextNode(slice));
		if (i < final.length) {
			el.appendChild(caret);
			i++;
			timeoutId = window.setTimeout(tick, speedMs);
		} else {
			onComplete?.();
		}
	};
	tick();
}

/** Machine à écrire sur durée fixe (GSAP) — rythme régulier, lecture rapide. */
function runTypewriterGsap(el: HTMLElement, final: string, durationSec: number, onComplete?: () => void): Promise<void> {
	const state = textFxState.get(el) ?? {};
	state.cancel?.();
	let tween: gsap.core.Tween | null = null;
	const cancel = () => {
		tween?.kill();
		tween = null;
	};
	state.cancel = cancel;
	textFxState.set(el, state);

	el.replaceChildren();
	const caret = document.createElement("span");
	caret.className = "tw-caret";
	caret.setAttribute("aria-hidden", "true");

	if (final.length === 0) {
		onComplete?.();
		return Promise.resolve();
	}

	const obj = { n: 0 };
	return new Promise((resolve) => {
		tween = gsap.to(obj, {
			n: final.length,
			duration: Math.max(0.12, durationSec),
			ease: "none",
			onUpdate: () => {
				const i = Math.min(final.length, Math.floor(obj.n));
				el.replaceChildren();
				const slice = final.slice(0, i);
				if (slice) el.appendChild(document.createTextNode(slice));
				if (i < final.length) el.appendChild(caret);
			},
			onComplete: () => {
				el.textContent = final;
				onComplete?.();
				resolve();
			},
		});
	});
}

function typewriterDurationForText(text: string, minSec: number, maxSec: number): number {
	const n = text.length;
	return Math.min(maxSec, Math.max(minSec, 0.28 + n * 0.0075));
}

function skipSequentialTextObserve(el: HTMLElement): boolean {
	if (el.closest("#hero-content") && (el.hasAttribute("data-typewriter") || el.hasAttribute("data-scramble"))) {
		return true;
	}
	if (el.closest(".about-block--present") && el.hasAttribute("data-typewriter")) return true;
	return false;
}

async function runHeroTextSequence() {
	const scrambleEl = document.querySelector<HTMLElement>("#hero-content [data-scramble]");
	const twEls = [...document.querySelectorAll<HTMLElement>("#hero-content [data-typewriter]")];

	if (scrambleEl) {
		const sc = scrambleEl.dataset.scrambleFinal ?? "";
		const dur = Math.min(950, 260 + sc.length * 34);
		await new Promise<void>((resolve) => {
			runScramble(scrambleEl, sc, resolve, dur);
		});
	}

	for (const el of twEls) {
		const tw = el.dataset.twFinal ?? "";
		typewriterEverSeen.add(el);
		const sec = typewriterDurationForText(tw, 0.85, 1.55);
		await runTypewriterGsap(el, tw, sec, () => typewriterCompleted.add(el));
	}
}

async function runAboutBioSequence() {
	const twEls = [...document.querySelectorAll<HTMLElement>(".about-block--present [data-typewriter]")];
	for (const el of twEls) {
		const tw = el.dataset.twFinal ?? "";
		typewriterEverSeen.add(el);
		const sec = typewriterDurationForText(tw, 0.55, 1.15);
		await runTypewriterGsap(el, tw, sec, () => typewriterCompleted.add(el));
	}
}

function resetTextEl(el: HTMLElement) {
	textFxState.get(el)?.cancel?.();
	el.replaceChildren();
}

function initTextFX(ac: AbortController) {
	textFxObserver?.disconnect();
	textFxObserver = null;
	heroSeqObserver?.disconnect();
	heroSeqObserver = null;
	aboutSeqObserver?.disconnect();
	aboutSeqObserver = null;
	heroSequentialStarted = false;
	aboutSequentialStarted = false;

	const nodes = [...document.querySelectorAll<HTMLElement>("[data-scramble], [data-typewriter]")];

	if (reduce()) {
		for (const el of nodes) {
			const tw = el.dataset.twFinal ?? "";
			const sc = el.dataset.scrambleFinal ?? "";
			if (el.hasAttribute("data-typewriter") && tw) {
				el.textContent = tw;
				typewriterCompleted.add(el);
				typewriterEverSeen.add(el);
			} else if (el.hasAttribute("data-scramble") && sc) el.textContent = sc;
		}
		return;
	}

	for (const el of nodes) {
		if (el.hasAttribute("data-typewriter") && !el.dataset.twFinal) {
			el.dataset.twFinal = el.textContent?.trim() ?? "";
		}
		if (el.hasAttribute("data-scramble") && !el.dataset.scrambleFinal) {
			el.dataset.scrambleFinal = el.textContent?.trim() ?? "";
		}
		el.replaceChildren();
	}

	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				const el = e.target as HTMLElement;
				const twFinal = el.dataset.twFinal ?? "";
				const scFinal = el.dataset.scrambleFinal ?? "";
				if (e.isIntersecting) {
					if (el.hasAttribute("data-typewriter") && twFinal) {
						typewriterEverSeen.add(el);
						if (typewriterCompleted.has(el)) {
							el.textContent = twFinal;
						} else {
							const speed = Math.max(12, Number(el.dataset.twSpeed ?? "34") || 34);
							runTypewriter(el, twFinal, speed, () => typewriterCompleted.add(el));
						}
					} else if (el.hasAttribute("data-scramble") && scFinal) {
						runScramble(el, scFinal);
					}
				} else {
					if (el.hasAttribute("data-typewriter")) {
						const twF = el.dataset.twFinal ?? "";
						textFxState.get(el)?.cancel?.();
						if (typewriterCompleted.has(el)) {
							el.textContent = twF;
						} else if (typewriterEverSeen.has(el) && twF) {
							el.textContent = twF;
							typewriterCompleted.add(el);
						} else {
							resetTextEl(el);
						}
					} else {
						resetTextEl(el);
					}
				}
			}
		},
		{ threshold: 0.2, rootMargin: "0px 0px -5% 0px" },
	);

	for (const el of nodes) {
		if (!skipSequentialTextObserve(el)) io.observe(el);
	}
	textFxObserver = io;

	const heroRoot = document.getElementById("hero");
	if (heroRoot && document.querySelector("#hero-content [data-scramble], #hero-content [data-typewriter]")) {
		const tryHeroNow = () => {
			if (heroSequentialStarted || reduce()) return;
			const r = heroRoot.getBoundingClientRect();
			if (r.top < innerHeight * 0.92 && r.bottom > innerHeight * 0.02) {
				heroSequentialStarted = true;
				void runHeroTextSequence();
			}
		};
		heroSeqObserver = new IntersectionObserver(
			(entries) => {
				const e = entries[0];
				if (e?.isIntersecting && !heroSequentialStarted) {
					heroSequentialStarted = true;
					void runHeroTextSequence();
				}
			},
			{ threshold: 0.06, rootMargin: "0px 0px 12% 0px" },
		);
		heroSeqObserver.observe(heroRoot);
		queueMicrotask(tryHeroNow);
	}

	const aboutRoot = document.querySelector<HTMLElement>(".about-block--present");
	if (aboutRoot?.querySelector("[data-typewriter]")) {
		aboutSeqObserver = new IntersectionObserver(
			(entries) => {
				const e = entries[0];
				if (e?.isIntersecting && !aboutSequentialStarted) {
					aboutSequentialStarted = true;
					void runAboutBioSequence();
				}
			},
			{ threshold: 0.1, rootMargin: "0px 0px -10% 0px" },
		);
		aboutSeqObserver.observe(aboutRoot);
	}

	ac.signal.addEventListener("abort", () => {
		textFxObserver?.disconnect();
		textFxObserver = null;
		heroSeqObserver?.disconnect();
		heroSeqObserver = null;
		aboutSeqObserver?.disconnect();
		aboutSeqObserver = null;
	});
}

function initGlobalPointer(ac: AbortController) {
	document.addEventListener(
		"pointermove",
		(e) => {
			mouseX = e.clientX;
			mouseY = e.clientY;
		},
		{ passive: true, signal: ac.signal },
	);
}

function initParallax(ac: AbortController) {
	const el = document.querySelector<HTMLElement>("[data-parallax]");
	if (!el || reduce()) return;

	const max = Number(el.dataset.parallaxMax ?? "14");

	const move = () => {
		const x = (mouseX / innerWidth - 0.5) * 2;
		const y = (mouseY / innerHeight - 0.5) * 2;
		el.style.transform = `translate3d(${x * max}px, ${y * max}px, 0)`;
	};

	document.addEventListener("pointermove", move, { passive: true, signal: ac.signal });
	move();
}

function initSysClock() {
	if (sysClockTimer) {
		clearInterval(sysClockTimer);
		sysClockTimer = null;
	}

	const el = document.getElementById("sys-clock");
	if (!el) return;

	const tick = () => {
		const d = new Date();
		el.textContent = d.toLocaleString("fr-FR", {
			weekday: "short",
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});
	};
	tick();
	if (!reduce()) sysClockTimer = setInterval(tick, 1000);
}

function killRiseScrollTriggers() {
	for (const st of riseScrollTriggers) st.kill();
	riseScrollTriggers.length = 0;
}

function killStackTagChipsFx() {
	for (const tw of stackTagChipTweens) {
		tw.scrollTrigger?.kill(false);
		tw.kill();
	}
	stackTagChipTweens.length = 0;
}

function scheduleProjectLineRevealResize() {
	clearTimeout(lineRevealResizeTimer);
	lineRevealResizeTimer = window.setTimeout(() => {
		if (!projectLineSplitInstances.length) return;
		for (const s of projectLineSplitInstances) {
			try {
				s.split();
			} catch {
				/* ignore */
			}
		}
		ScrollTrigger.refresh();
	}, 160);
}

function killProjectLineReveal() {
	clearTimeout(lineRevealResizeTimer);
	lineRevealResizeTimer = 0;
	for (const anim of projectLineAnimations) {
		anim.scrollTrigger?.kill(false);
		anim.kill();
	}
	projectLineAnimations.length = 0;
	for (const s of projectLineSplitInstances) {
		try {
			s.revert();
		} catch {
			/* ignore */
		}
	}
	projectLineSplitInstances.length = 0;
}

/**
 * Pastilles techno : même tween que la stack « À propos » (pen GreenSock JojaebV).
 */
function initStackTagChips() {
	killStackTagChipsFx();

	const roots = [
		document.getElementById("about-stack-tags"),
		document.getElementById("project-stack-tags"),
	].filter((n): n is HTMLElement => !!n);

	if (!roots.length || reduce()) return;

	const run = () => {
		for (const root of roots) {
			const chips = [...root.querySelectorAll<HTMLElement>(".chip")];
			if (!chips.length) continue;
			const tw = gsap.from(chips, {
				y: -100,
				opacity: 0,
				rotation: "random(-80, 80)",
				stagger: 0.1,
				duration: 1,
				ease: "back",
				scrollTrigger: {
					trigger: root,
					start: "top 88%",
					once: true,
				},
			});
			stackTagChipTweens.push(tw);
		}
		ScrollTrigger.refresh();
	};

	void document.fonts.ready.then(run);
}

/**
 * Fiche projet : lignes masquées + ScrollTrigger (esprit GreenSock LEYqezo / SplitText — via split-type).
 * Hors titres (.readme-heading, h1 article, etc.).
 */
function initProjectReadmeLineReveal(ac: AbortController) {
	killProjectLineReveal();

	if (!document.querySelector(".project-page") || reduce()) return;

	const textSelectors = [
		".project-page__lead",
		".readme-content .readme-p",
		".readme-content .readme-li",
		".readme-content .readme-quote",
	].join(", ");

	const textEls = [...document.querySelectorAll<HTMLElement>(`.project-page ${textSelectors}`)].filter(
		(el) => (el.textContent?.trim().length ?? 0) > 0,
	);

	const run = () => {
		for (const el of textEls) {
			const split = new SplitType(el, {
				types: "lines,words",
				lineClass: "readme-split-line",
				wordClass: "readme-split-word",
			});
			projectLineSplitInstances.push(split);

			const lines = split.lines;
			if (!lines?.length) continue;

			/* Ordre visuel haut → bas (split-type suit en général le flux ; on verrouille au cas où). */
			const sortedLines = [...lines].sort(
				(a, b) => a.offsetTop - b.offsetTop || a.offsetLeft - b.offsetLeft,
			);

			const lineWordGroups = sortedLines
				.map((line) => [...line.querySelectorAll<HTMLElement>(".readme-split-word")])
				.filter((words) => words.length > 0);
			if (!lineWordGroups.length) continue;

			const isLead = el.classList.contains("project-page__lead");
			/* Chapo : plus vif ; toutes les lignes : enchaînement strict (ligne suivante après la précédente). */
			const duration = isLead ? 0.34 : 0.48;
			const wordStagger = isLead ? 0.01 : 0.018;
			const lineGap = isLead ? ">+=0.02" : ">+=0.04";

			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: el,
					start: "top 88%",
					once: true,
				},
			});

			let first = true;
			for (const words of lineWordGroups) {
				tl.from(
					words,
					{
						yPercent: 110,
						opacity: 0,
						duration,
						stagger: wordStagger,
						ease: "power3.out",
					},
					first ? 0 : lineGap,
				);
				first = false;
			}

			projectLineAnimations.push(tl);
		}

		const preWraps = [...document.querySelectorAll<HTMLElement>(".project-page .readme-pre-wrap")].filter(
			(el) => (el.textContent?.trim().length ?? 0) > 0,
		);
		for (const el of preWraps) {
			const tw = gsap.from(el, {
				y: 28,
				opacity: 0,
				duration: 0.55,
				ease: "power2.out",
				scrollTrigger: {
					trigger: el,
					start: "top 90%",
					once: true,
				},
			});
			projectLineAnimations.push(tw);
		}

		if (projectLineSplitInstances.length) {
			window.addEventListener("resize", scheduleProjectLineRevealResize, { passive: true, signal: ac.signal });
		}

		ScrollTrigger.refresh();
	};

	void document.fonts.ready.then(run);
}

function parseRiseDelaySec(el: HTMLElement): number {
	const raw = getComputedStyle(el).getPropertyValue("--rise-delay").trim();
	const m = /^([\d.]+)ms$/.exec(raw);
	return m ? parseFloat(m[1]) / 1000 : 0;
}

/** Retire résidus éventuels (HMR / anciens effets scroll) sur les sections plein écran. */
function clearLayeredScrollArtifacts() {
	document.documentElement.classList.remove("gsap-layered-scroll");
	document.querySelectorAll<HTMLElement>("main > section.section-viewport").forEach((el) => {
		el.style.removeProperty("z-index");
	});
}

function killProjectsHorizontalScroll() {
	if (projectsHorizontalST) {
		projectsHorizontalST.kill();
		projectsHorizontalST = null;
	}
	const track = document.querySelector<HTMLElement>("[data-projects-track]");
	if (track) gsap.set(track, { clearProps: "x" });
}

/** Section #projects : défilement horizontal lié au scroll vertical (pin + scrub). */
function initProjectsHorizontalScroll() {
	killProjectsHorizontalScroll();

	const section = document.getElementById("projects");
	if (!section || reduce()) return;

	const pinEl = section.querySelector<HTMLElement>("[data-projects-pin]");
	const viewport = section.querySelector<HTMLElement>("[data-projects-viewport]");
	const track = section.querySelector<HTMLElement>("[data-projects-track]");
	if (!pinEl || !viewport || !track) return;

	const overflowPx = () => track.scrollWidth - viewport.clientWidth;
	if (overflowPx() <= 2) return;

	const tween = gsap.to(track, {
		x: () => Math.min(0, viewport.clientWidth - track.scrollWidth),
		ease: "none",
		scrollTrigger: {
			trigger: pinEl,
			start: "top top",
			end: () => `+=${Math.ceil(overflowPx())}`,
			pin: true,
			scrub: true,
			invalidateOnRefresh: true,
			/* Évite le « flash » au début du pin ; compense souvent un léger saut vertical */
			anticipatePin: 1,
		},
	});
	projectsHorizontalST = tween.scrollTrigger ?? null;
}

/** Révélation au scroll (GSAP + ScrollTrigger), cascade `--rise-delay` sur les cartes. */
function initRise() {
	killRiseScrollTriggers();

	if (reduce()) {
		document.querySelectorAll("[data-rise]").forEach((n) => n.classList.add("is-visible"));
		ScrollTrigger.refresh();
		return;
	}

	const els = [...document.querySelectorAll<HTMLElement>("[data-rise]")];
	for (const el of els) {
		const isCard = el.classList.contains("project-card");
		const delay = parseRiseDelaySec(el);

		gsap.set(el, {
			autoAlpha: 0,
			y: isCard ? 52 : 36,
			scale: isCard ? 0.96 : 0.98,
			filter: isCard ? "saturate(0.78) brightness(0.92)" : "saturate(0.88)",
			...(isCard ? { boxShadow: "0 0 0 0 rgba(0,0,0,0)" } : {}),
		});

		const st = ScrollTrigger.create({
			trigger: el,
			start: "top 88%",
			once: true,
			onEnter: () => {
				el.classList.add("is-visible");
				const vars: gsap.TweenVars = {
					autoAlpha: 1,
					y: 0,
					scale: 1,
					filter: "saturate(1) brightness(1)",
					duration: isCard ? 1.08 : 0.95,
					delay,
					ease: "power3.out",
					overwrite: "auto",
				};
				if (isCard) {
					vars.boxShadow =
						"0 18px 48px -28px color-mix(in srgb, var(--accent) 22%, transparent)";
				}
				gsap.to(el, vars);
			},
		});
		riseScrollTriggers.push(st);
	}

	ScrollTrigger.refresh();
}

function normalizePathname(p: string): string {
	const x = p.replace(/\/$/, "");
	return x === "" ? "/" : x;
}

/** Fiche projet : `/projets/<slug>` (avec ou sans préfixe `BASE_URL`, ex. GitHub Pages). */
const PROJECT_DETAIL_PATH_RE = /\/projets\/[^/]+$/;

function isProjectDetailPathname(pathname: string): boolean {
	return PROJECT_DETAIL_PATH_RE.test(normalizePathname(pathname));
}

/**
 * Les clics sur liens internes passent toujours `direction: "forward"` dans le routeur Astro ;
 * on aligne « précédent » sur `back` pour inverser les animations View Transitions.
 */
async function initReadmeMermaid() {
	if (!document.querySelector(".readme-mermaid.mermaid")) return;

	const { default: mermaid } = await import("mermaid");
	if (!mermaidInitialized) {
		mermaid.initialize({
			startOnLoad: false,
			theme: "dark",
			securityLevel: "loose",
			themeVariables: {
				background: "#070712",
				mainBkg: "#0e1022",
				textColor: "#e8eaf8",
				primaryColor: "#1e1b4b",
				primaryTextColor: "#e8eaf8",
				primaryBorderColor: "#818cf8",
				lineColor: "#8b92b0",
				secondaryColor: "#0e1022",
				tertiaryColor: "#070712",
				fontFamily: '"Share Tech Mono", ui-monospace, monospace',
			},
		});
		mermaidInitialized = true;
	}

	try {
		await mermaid.run({
			querySelector: ".readme-mermaid.mermaid",
			suppressErrors: true,
		});
		requestAnimationFrame(() => ScrollTrigger.refresh());
	} catch {
		/* schéma invalide : Mermaid affiche déjà une erreur dans le DOM si besoin */
	}
}

function initProjectDetailNavTransitionDirection(ac: AbortController) {
	document.addEventListener(
		"astro:before-preparation",
		(e) => {
			if (!isTransitionBeforePreparationEvent(e)) return;
			if (!isProjectDetailPathname(e.from.pathname) || !isProjectDetailPathname(e.to.pathname)) return;
			const src = e.sourceElement;
			if (!(src instanceof Element)) return;
			const nav = src.closest("[data-project-nav]");
			if (!nav) return;
			const which = nav.getAttribute("data-project-nav");
			if (which === "prev") e.direction = "back";
			else if (which === "next") e.direction = "forward";
		},
		{ signal: ac.signal },
	);
}

/** Ancre même page (ex. `/Portfolio/#about`) — compatible GitHub Pages sous-chemin. */
function hashForSamePageNav(href: string): string | null {
	try {
		const u = new URL(href, location.href);
		if (u.origin !== location.origin) return null;
		if (!u.hash) return null;
		if (normalizePathname(u.pathname) !== normalizePathname(location.pathname)) return null;
		return u.hash;
	} catch {
		return null;
	}
}

/** Même approche que le démo GreenSock ScrollToPlugin (CodePen LZOMKY). */
function initSmoothNav(ac: AbortController) {
	document.addEventListener(
		"click",
		(e) => {
			const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
			if (!a) return;
			const href = a.getAttribute("href");
			if (!href) return;

			const hash = hashForSamePageNav(href);
			if (!hash) return;

			const target = document.querySelector(hash);
			if (!target) return;
			e.preventDefault();
			const u = new URL(location.href);
			u.hash = hash;
			history.pushState(null, "", u.pathname + u.search + hash);

			if (reduce()) {
				target.scrollIntoView({ block: "start" });
				queueMicrotask(() => {
					window.dispatchEvent(new Event("scroll"));
				});
				return;
			}

			gsap.to(window, {
				duration: 1,
				scrollTo: { y: hash, offsetY: 120 },
				onComplete: () => {
					window.dispatchEvent(new Event("scroll"));
				},
			});
		},
		{ capture: true, signal: ac.signal },
	);
}

function initCursor(ac: AbortController) {
	const ring = document.getElementById("cursor-ring");
	const dot = document.getElementById("cursor-dot");
	if (!ring || !dot || reduce() || !finePointer()) {
		document.body.classList.remove("has-custom-cursor", "cursor-hover");
		return;
	}

	document.body.classList.add("has-custom-cursor");

	let rx = mouseX;
	let ry = mouseY;
	let raf = 0;

	const loop = () => {
		raf = 0;
		rx += (mouseX - rx) * 0.14;
		ry += (mouseY - ry) * 0.14;
		ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
		dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
	};

	const schedule = () => {
		if (!raf) raf = requestAnimationFrame(loop);
	};

	document.addEventListener("pointermove", schedule, { passive: true, signal: ac.signal });

	const setHover = (on: boolean) => {
		document.body.classList.toggle("cursor-hover", on);
	};

	document.addEventListener(
		"mouseover",
		(e) => {
			const t = e.target as HTMLElement | null;
			if (!t) return;
			if (t.closest(INTERACT_SEL)) setHover(true);
		},
		{ signal: ac.signal },
	);

	document.addEventListener(
		"mouseout",
		(e) => {
			const t = e.target as HTMLElement | null;
			const rel = e.relatedTarget as HTMLElement | null;
			if (!t?.closest(INTERACT_SEL)) return;
			if (!rel?.closest(INTERACT_SEL)) setHover(false);
		},
		{ signal: ac.signal },
	);

	schedule();
}

export function boot() {
	cleanupBoot?.();

	if (sysClockTimer) {
		clearInterval(sysClockTimer);
		sysClockTimer = null;
	}
	gsap.killTweensOf(window);
	clearLayeredScrollArtifacts();
	killRiseScrollTriggers();
	killProjectsHorizontalScroll();
	killStackTagChipsFx();
	killProjectLineReveal();
	textFxObserver?.disconnect();
	textFxObserver = null;
	const ac = new AbortController();
	cleanupBoot = () => {
		gsap.killTweensOf(window);
		ac.abort();
		if (sysClockTimer) {
			clearInterval(sysClockTimer);
			sysClockTimer = null;
		}
		clearLayeredScrollArtifacts();
		killRiseScrollTriggers();
		killProjectsHorizontalScroll();
		killStackTagChipsFx();
		killProjectLineReveal();
		textFxObserver?.disconnect();
		textFxObserver = null;
		document.body.classList.remove("has-custom-cursor", "cursor-hover");
	};

	initGlobalPointer(ac);
	initProjectDetailNavTransitionDirection(ac);
	initSmoothNav(ac);
	initParallax(ac);
	initSysClock();
	initRise();
	initProjectsHorizontalScroll();
	initStackTagChips();
	initProjectReadmeLineReveal(ac);
	initTextFX(ac);
	initCursor(ac);

	requestAnimationFrame(() => {
		ScrollTrigger.refresh();
		void document.fonts.ready.then(() => {
			void initReadmeMermaid();
		});
	});
}
