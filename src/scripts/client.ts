const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => matchMedia("(pointer: fine)").matches;

const INTERACT_SEL = "a, button, [role='button'], input, textarea, select, .tile-action";

const GLYPHS =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789█▒░·/&%$#@!?";

let mouseX = 0;
let mouseY = 0;

let cleanupBoot: (() => void) | null = null;
let cleanupField: (() => void) | null = null;
let sysClockTimer: ReturnType<typeof setInterval> | null = null;
let riseObserver: IntersectionObserver | null = null;
let textFxObserver: IntersectionObserver | null = null;

const textFxState = new WeakMap<HTMLElement, { cancel?: () => void }>();

function pickGlyph() {
	return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "·";
}

function runScramble(el: HTMLElement, final: string) {
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
	const duration = Math.min(2400, 380 + len * 42);
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
		else el.textContent = final;
	}
	rafId = requestAnimationFrame(frame);
}

function runTypewriter(el: HTMLElement, final: string, speedMs: number) {
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
		}
	};
	tick();
}

function resetTextEl(el: HTMLElement) {
	textFxState.get(el)?.cancel?.();
	el.replaceChildren();
}

function initTextFX(ac: AbortController) {
	textFxObserver?.disconnect();
	textFxObserver = null;

	const nodes = [...document.querySelectorAll<HTMLElement>("[data-scramble], [data-typewriter]")];

	if (reduce()) {
		for (const el of nodes) {
			const tw = el.dataset.twFinal ?? "";
			const sc = el.dataset.scrambleFinal ?? "";
			if (el.hasAttribute("data-typewriter") && tw) el.textContent = tw;
			else if (el.hasAttribute("data-scramble") && sc) el.textContent = sc;
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
						const speed = Math.max(12, Number(el.dataset.twSpeed ?? "34") || 34);
						runTypewriter(el, twFinal, speed);
					} else if (el.hasAttribute("data-scramble") && scFinal) {
						runScramble(el, scFinal);
					}
				} else {
					resetTextEl(el);
				}
			}
		},
		{ threshold: 0.2, rootMargin: "0px 0px -5% 0px" },
	);

	for (const el of nodes) io.observe(el);
	textFxObserver = io;

	ac.signal.addEventListener("abort", () => {
		textFxObserver?.disconnect();
		textFxObserver = null;
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

function initField(ac: AbortController) {
	cleanupField?.();
	cleanupField = null;

	const canvas = document.getElementById("field-canvas") as HTMLCanvasElement | null;
	if (!canvas || reduce()) return;

	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	const VOID = "#020308";
	const N = () => (innerWidth < 640 ? 50 : 88);
	let particles: { x: number; y: number; vx: number; vy: number }[] = [];
	let raf = 0;

	function spawn() {
		const n = N();
		particles = [];
		for (let i = 0; i < n; i++) {
			particles.push({
				x: Math.random() * innerWidth,
				y: Math.random() * innerHeight,
				vx: (Math.random() - 0.5) * 0.22,
				vy: (Math.random() - 0.5) * 0.22,
			});
		}
	}

	function resize() {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = Math.floor(innerWidth * dpr);
		canvas.height = Math.floor(innerHeight * dpr);
		canvas.style.width = `${innerWidth}px`;
		canvas.style.height = `${innerHeight}px`;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		spawn();
	}

	resize();
	window.addEventListener("resize", resize, { passive: true, signal: ac.signal });

	const linkDist = innerWidth < 640 ? 95 : 128;
	const cursorPull = 0.018;
	const cursorGlowR = 160;

	function tick() {
		ctx.fillStyle = VOID;
		ctx.fillRect(0, 0, innerWidth, innerHeight);

		if (finePointer()) {
			for (const p of particles) {
				const dx = mouseX - p.x;
				const dy = mouseY - p.y;
				const d = Math.hypot(dx, dy) + 8;
				if (d < cursorGlowR) {
					const f = (cursorPull * (cursorGlowR - d)) / cursorGlowR;
					p.vx += (dx / d) * f;
					p.vy += (dy / d) * f;
				}
				p.vx *= 0.992;
				p.vy *= 0.992;
			}
		}

		for (const p of particles) {
			p.x += p.vx;
			p.y += p.vy;
			if (p.x < 0) p.x = innerWidth;
			if (p.x > innerWidth) p.x = 0;
			if (p.y < 0) p.y = innerHeight;
			if (p.y > innerHeight) p.y = 0;
		}

		for (let i = 0; i < particles.length; i++) {
			for (let j = i + 1; j < particles.length; j++) {
				const a = particles[i]!;
				const b = particles[j]!;
				const dx = a.x - b.x;
				const dy = a.y - b.y;
				const d = Math.hypot(dx, dy);
				if (d < linkDist) {
					let alpha = (1 - d / linkDist) * 0.16;
					if (finePointer()) {
						const mx = (a.x + b.x) / 2;
						const my = (a.y + b.y) / 2;
						const dc = Math.hypot(mouseX - mx, mouseY - my);
						if (dc < cursorGlowR) alpha += ((cursorGlowR - dc) / cursorGlowR) * 0.12;
					}
					ctx.strokeStyle = `rgba(61, 219, 255, ${Math.min(0.45, alpha)})`;
					ctx.lineWidth = 0.55;
					ctx.beginPath();
					ctx.moveTo(a.x, a.y);
					ctx.lineTo(b.x, b.y);
					ctx.stroke();
				}
			}
		}

		for (const p of particles) {
			ctx.beginPath();
			ctx.arc(p.x, p.y, 1.15, 0, Math.PI * 2);
			let a = 0.5;
			if (finePointer()) {
				const dc = Math.hypot(mouseX - p.x, mouseY - p.y);
				if (dc < cursorGlowR) a += ((cursorGlowR - dc) / cursorGlowR) * 0.45;
			}
			ctx.fillStyle = `rgba(120, 235, 255, ${Math.min(1, a)})`;
			ctx.fill();
		}

		raf = requestAnimationFrame(tick);
	}

	raf = requestAnimationFrame(tick);

	cleanupField = () => {
		cancelAnimationFrame(raf);
	};
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

/** Révélation : rejoue à chaque entrée dans le viewport (pas en boucle CSS). */
function initRise() {
	riseObserver?.disconnect();
	riseObserver = null;

	if (reduce()) {
		document.querySelectorAll("[data-rise]").forEach((n) => n.classList.add("is-visible"));
		return;
	}

	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				e.target.classList.toggle("is-visible", e.isIntersecting);
			}
		},
		{ threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
	);
	document.querySelectorAll("[data-rise]").forEach((n) => io.observe(n));
	riseObserver = io;
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

function initSmoothNav(ac: AbortController) {
	if (reduce()) return;
	document.addEventListener(
		"click",
		(e) => {
			const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
			if (!a) return;
			const href = a.getAttribute("href");
			if (!href) return;

			let hash = "";
			if (href.startsWith("#")) hash = href;
			else if (href.startsWith("/#")) hash = href.slice(1);
			else return;

			if (location.pathname !== "/" && location.pathname !== "/index.html") return;

			const target = document.querySelector(hash);
			if (!target) return;
			e.preventDefault();
			target.scrollIntoView({ behavior: "smooth", block: "start" });
			history.pushState(null, "", `/${hash}`);
			setTimeout(() => {
				window.dispatchEvent(new Event("scroll"));
			}, 480);
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
	riseObserver?.disconnect();
	riseObserver = null;
	textFxObserver?.disconnect();
	textFxObserver = null;
	cleanupField?.();
	cleanupField = null;

	const ac = new AbortController();
	cleanupBoot = () => {
		ac.abort();
		cleanupField?.();
		cleanupField = null;
		if (sysClockTimer) {
			clearInterval(sysClockTimer);
			sysClockTimer = null;
		}
		riseObserver?.disconnect();
		riseObserver = null;
		textFxObserver?.disconnect();
		textFxObserver = null;
		document.body.classList.remove("has-custom-cursor", "cursor-hover");
	};

	initGlobalPointer(ac);
	initSmoothNav(ac);
	initSections(ac);
	initField(ac);
	initParallax(ac);
	initSysClock();
	initRise();
	initTextFX(ac);
	initCursor(ac);
}
