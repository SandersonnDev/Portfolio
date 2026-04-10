import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => matchMedia("(pointer: fine)").matches;

const INTERACT_SEL = "a, button, [role='button'], input, textarea, select, .tile-action";

const GLYPHS =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789█▒░·/&%$#@!?";

let mouseX = 0;
let mouseY = 0;

let cleanupBoot: (() => void) | null = null;
let sysClockTimer: ReturnType<typeof setInterval> | null = null;
const riseScrollTriggers: ScrollTrigger[] = [];
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

function parseRiseDelaySec(el: HTMLElement): number {
	const raw = getComputedStyle(el).getPropertyValue("--rise-delay").trim();
	const m = /^([\d.]+)ms$/.exec(raw);
	return m ? parseFloat(m[1]) / 1000 : 0;
}

/** Retire l’ancien mode « layered scroll » (pins + snap) si présent après HMR / navigation. */
function clearLayeredScrollArtifacts() {
	document.documentElement.classList.remove("gsap-layered-scroll");
	document.querySelectorAll<HTMLElement>("main > section[data-section].snap-section").forEach((el) => {
		el.style.removeProperty("z-index");
	});
}

/** Révélation au scroll (GSAP + ScrollTrigger), cascade `--rise-delay` sur les cartes. */
function initRise() {
	killRiseScrollTriggers();

	if (reduce()) {
		const riseN = document.querySelectorAll("[data-rise]").length;
		document.querySelectorAll("[data-rise]").forEach((n) => n.classList.add("is-visible"));
		ScrollTrigger.refresh();
		// #region agent log
		fetch("http://127.0.0.1:7498/ingest/6524b809-103a-4f86-a8f9-ce482dd8f8ab", {
			method: "POST",
			headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "245b5a" },
			body: JSON.stringify({
				sessionId: "245b5a",
				location: "client.ts:initRise:reduce-branch",
				message: "init_rise_state",
				data: { riseCount: riseN, triggerCount: 0, reduceMotion: true, scrollY: window.scrollY },
				timestamp: Date.now(),
				runId: "pre-fix",
				hypothesisId: "H5",
			}),
		}).catch(() => {});
		// #endregion
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
	// #region agent log
	fetch("http://127.0.0.1:7498/ingest/6524b809-103a-4f86-a8f9-ce482dd8f8ab", {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "245b5a" },
		body: JSON.stringify({
			sessionId: "245b5a",
			location: "client.ts:initRise:afterRefresh",
			message: "init_rise_state",
			data: {
				riseCount: els.length,
				triggerCount: riseScrollTriggers.length,
				reduceMotion: reduce(),
				scrollY: window.scrollY,
			},
			timestamp: Date.now(),
			runId: "pre-fix",
			hypothesisId: "H5",
		}),
	}).catch(() => {});
	// #endregion
}

let sectionRaf = 0;
function initSections(ac: AbortController) {
	const sections = [...document.querySelectorAll<HTMLElement>("[data-section]")];
	if (!sections.length) return;

	const update = () => {
		sectionRaf = 0;
		const vh = innerHeight;
		let best: HTMLElement | null = null;
		let bestScore = 0;
		for (const s of sections) {
			const r = s.getBoundingClientRect();
			const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
			if (visible > bestScore) {
				bestScore = visible;
				best = s;
			}
		}
		const threshold = vh * 0.12;
		for (const s of sections) {
			s.classList.toggle("is-active", s === best && bestScore > threshold);
		}
	};

	const onScroll = () => {
		if (sectionRaf) return;
		sectionRaf = requestAnimationFrame(update);
	};

	window.addEventListener("scroll", onScroll, { passive: true, signal: ac.signal });
	window.addEventListener("resize", onScroll, { passive: true, signal: ac.signal });
	update();
}

function normalizePathname(p: string): string {
	const x = p.replace(/\/$/, "");
	return x === "" ? "/" : x;
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

function initSmoothNav(ac: AbortController) {
	document.addEventListener(
		"click",
		(e) => {
			const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
			if (!a) return;
			const href = a.getAttribute("href");
			if (!href) return;

			const hash = hashForSamePageNav(href);
// #region agent log
			if (href.includes("#")) {
				let uPath = "";
				try {
					uPath = new URL(href, location.href).pathname;
				} catch {
					uPath = "(parse-error)";
				}
				fetch("http://127.0.0.1:7498/ingest/6524b809-103a-4f86-a8f9-ce482dd8f8ab", {
					method: "POST",
					headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "245b5a" },
					body: JSON.stringify({
						sessionId: "245b5a",
						location: "client.ts:initSmoothNav:anchor-click",
						message: "smooth_nav_anchor_probe",
						data: {
							href,
							hash,
							locPath: location.pathname,
							locPathNorm: normalizePathname(location.pathname),
							linkPathNorm: normalizePathname(uPath),
							reduceMotion: reduce(),
							hasTarget: !!(hash && document.querySelector(hash)),
							defaultPrevented: e.defaultPrevented,
						},
						timestamp: Date.now(),
						runId: "pre-fix",
						hypothesisId: "H1-H4",
					}),
				}).catch(() => {});
			}
			// #endregion
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

			// #region agent log
			fetch("http://127.0.0.1:7498/ingest/6524b809-103a-4f86-a8f9-ce482dd8f8ab", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "245b5a" },
				body: JSON.stringify({
					sessionId: "245b5a",
					location: "client.ts:initSmoothNav:gsap-scrollTo",
					message: "smooth_nav_gsap_start",
					data: { hash, scrollY: window.scrollY },
					timestamp: Date.now(),
					runId: "pre-fix",
					hypothesisId: "H4",
				}),
			}).catch(() => {});
			// #endregion
			gsap.to(window, {
				duration: 1,
				ease: "power2.inOut",
				scrollTo: { y: target, offsetY: 6, autoKill: true },
				overwrite: "auto",
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
		textFxObserver?.disconnect();
		textFxObserver = null;
		document.body.classList.remove("has-custom-cursor", "cursor-hover");
	};

	initGlobalPointer(ac);
	initSmoothNav(ac);
	initSections(ac);
	initParallax(ac);
	initSysClock();
	initRise();
	initTextFX(ac);
	initCursor(ac);

	requestAnimationFrame(() => {
		ScrollTrigger.refresh();
		// #region agent log
		fetch("http://127.0.0.1:7498/ingest/6524b809-103a-4f86-a8f9-ce482dd8f8ab", {
			method: "POST",
			headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "245b5a" },
			body: JSON.stringify({
				sessionId: "245b5a",
				location: "client.ts:boot:afterRefresh",
				message: "verify_post_fix_no_layered_pins",
				data: {
					scrollY: window.scrollY,
					maxScroll: ScrollTrigger.maxScroll(window),
					docScrollH: document.documentElement.scrollHeight,
					hasLayeredClass: document.documentElement.classList.contains("gsap-layered-scroll"),
				},
				timestamp: Date.now(),
				runId: "post-fix",
				hypothesisId: "FIX",
			}),
		}).catch(() => {});
		// #endregion
	});
}
