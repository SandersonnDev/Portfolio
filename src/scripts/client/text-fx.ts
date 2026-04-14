import { gsap } from "./register-gsap";
import { reduce } from "./env";
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\u2588\u2592\u2591\u00b7/&%$#@!?";
let textFxObserver: IntersectionObserver | null = null;
let heroSeqObserver: IntersectionObserver | null = null;
let aboutSeqObserver: IntersectionObserver | null = null;
let heroSequentialStarted = false;
let aboutSequentialStarted = false;
const textFxState = new WeakMap<HTMLElement, {
    cancel?: () => void;
}>();
const typewriterCompleted = new WeakSet<HTMLElement>();
const typewriterEverSeen = new WeakSet<HTMLElement>();

type AbbrLink = {
    label: string;
};

let abbrTipId = 0;

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getAbbrLinksFor(el: HTMLElement): AbbrLink[] {
    const root = el.closest<HTMLElement>(".about-block--present");
    const raw = root?.dataset.abbr;
    if (!raw)
        return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed))
            return [];
        return parsed
            .filter((x): x is AbbrLink => typeof x === "object" && x !== null && "label" in x && typeof (x as any).label === "string")
            .map((x) => ({ label: x.label }));
    }
    catch {
        return [];
    }
}

function buildAbbrEnhancedHtml(text: string, links: AbbrLink[]): string {
    if (!text || links.length === 0)
        return escapeHtml(text);
    // Remplace uniquement les occurrences entre parenthèses (ex: (CDUI), (SSR), (RSE))
    // par l’abréviation + une pastille info (sans tooltip).
    const keys = links
        .map((l) => (l.label.endsWith("*") ? l.label.slice(0, -1) : l.label))
        .filter((k) => k.length > 0);
    if (keys.length === 0)
        return escapeHtml(text);
    const pattern = new RegExp(`\\((?:\\s*)(${keys.map((k) => k.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")).join("|")})(?:\\s*)\\)`, "g");
    let last = 0;
    let out = "";
    for (const m of text.matchAll(pattern)) {
        const idx = m.index ?? 0;
        const key = m[1] ?? "";
        out += escapeHtml(text.slice(last, idx));
        // L’icône doit être *dans* la parenthèse : (SSRⓘ)
        out += `(${escapeHtml(key)}<span class="abbr-inline" aria-hidden="true">` +
            `<i class="fa-solid fa-info abbr-inline__icon" aria-hidden="true"></i>` +
            `</span>)`;
        last = idx + (m[0]?.length ?? 0);
    }
    out += escapeHtml(text.slice(last));
    return out;
}

function applyAbbrEnhancements(el: HTMLElement, finalText?: string) {
    if (!el.closest(".about-block--present"))
        return;
    const links = getAbbrLinksFor(el);
    if (links.length === 0)
        return;
    const txt = finalText ?? el.textContent ?? "";
    if (!txt.includes("("))
        return;
    el.innerHTML = buildAbbrEnhancedHtml(txt, links);
}
function pickGlyph() {
    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? ".";
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
    const duration = durationOverrideMs ?? Math.min(2400, 380 + len * 42);
    const start = performance.now();
    function frame(now: number) {
        if (cancelled)
            return;
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
            if (i < reveal)
                out += c;
            else if (c === " ")
                out += " ";
            else
                out += pickGlyph();
        }
        el.textContent = out;
        if (t < 1)
            rafId = requestAnimationFrame(frame);
        else {
            el.textContent = final;
            onComplete?.();
        }
    }
    rafId = requestAnimationFrame(frame);
}
function runTypewriter(el: HTMLElement, final: string, speedMs: number, onComplete?: () => void) {
    const state = textFxState.get(el) ?? {};
    state.cancel?.();
    let cancelled = false;
    let timeoutId = 0;
    const cancel = () => {
        cancelled = true;
        if (timeoutId)
            window.clearTimeout(timeoutId);
    };
    state.cancel = cancel;
    textFxState.set(el, state);
    el.replaceChildren();
    const caret = document.createElement("span");
    caret.className = "tw-caret";
    caret.setAttribute("aria-hidden", "true");
    let i = 0;
    const tick = () => {
        if (cancelled)
            return;
        el.replaceChildren();
        const slice = final.slice(0, i);
        if (slice)
            el.appendChild(document.createTextNode(slice));
        if (i < final.length) {
            el.appendChild(caret);
            i++;
            timeoutId = window.setTimeout(tick, speedMs);
        }
        else {
            applyAbbrEnhancements(el, final);
            onComplete?.();
        }
    };
    tick();
}
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
                if (slice)
                    el.appendChild(document.createTextNode(slice));
                if (i < final.length)
                    el.appendChild(caret);
            },
            onComplete: () => {
                el.textContent = final;
                applyAbbrEnhancements(el, final);
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
    if (el.closest(".about-block--present") && el.hasAttribute("data-typewriter"))
        return true;
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
export function disconnectTextFX() {
    textFxObserver?.disconnect();
    textFxObserver = null;
    heroSeqObserver?.disconnect();
    heroSeqObserver = null;
    aboutSeqObserver?.disconnect();
    aboutSeqObserver = null;
    heroSequentialStarted = false;
    aboutSequentialStarted = false;
}
export function initTextFX(ac: AbortController) {
    disconnectTextFX();
    const nodes = [...document.querySelectorAll<HTMLElement>("[data-scramble], [data-typewriter]")];
    if (reduce()) {
        for (const el of nodes) {
            const tw = el.dataset.twFinal ?? "";
            const sc = el.dataset.scrambleFinal ?? "";
            if (el.hasAttribute("data-typewriter") && tw) {
                el.textContent = tw;
                applyAbbrEnhancements(el, tw);
                typewriterCompleted.add(el);
                typewriterEverSeen.add(el);
            }
            else if (el.hasAttribute("data-scramble") && sc)
                el.textContent = sc;
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
    const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
            const el = e.target as HTMLElement;
            const twFinal = el.dataset.twFinal ?? "";
            const scFinal = el.dataset.scrambleFinal ?? "";
            if (e.isIntersecting) {
                if (el.hasAttribute("data-typewriter") && twFinal) {
                    typewriterEverSeen.add(el);
                    if (typewriterCompleted.has(el)) {
                        el.textContent = twFinal;
                        applyAbbrEnhancements(el, twFinal);
                    }
                    else {
                        const speed = Math.max(12, Number(el.dataset.twSpeed ?? "34") || 34);
                        runTypewriter(el, twFinal, speed, () => typewriterCompleted.add(el));
                    }
                }
                else if (el.hasAttribute("data-scramble") && scFinal) {
                    runScramble(el, scFinal);
                }
            }
            else {
                if (el.hasAttribute("data-typewriter")) {
                    const twF = el.dataset.twFinal ?? "";
                    textFxState.get(el)?.cancel?.();
                    if (typewriterCompleted.has(el)) {
                        el.textContent = twF;
                        applyAbbrEnhancements(el, twF);
                    }
                    else if (typewriterEverSeen.has(el) && twF) {
                        el.textContent = twF;
                        applyAbbrEnhancements(el, twF);
                        typewriterCompleted.add(el);
                    }
                    else {
                        resetTextEl(el);
                    }
                }
                else {
                    resetTextEl(el);
                }
            }
        }
    }, { threshold: 0.2, rootMargin: "0px 0px -5% 0px" });
    for (const el of nodes) {
        if (!skipSequentialTextObserve(el))
            io.observe(el);
    }
    textFxObserver = io;
    const heroRoot = document.getElementById("hero");
    if (heroRoot && document.querySelector("#hero-content [data-scramble], #hero-content [data-typewriter]")) {
        const tryHeroNow = () => {
            if (heroSequentialStarted || reduce())
                return;
            const r = heroRoot.getBoundingClientRect();
            if (r.top < innerHeight * 0.92 && r.bottom > innerHeight * 0.02) {
                heroSequentialStarted = true;
                void runHeroTextSequence();
            }
        };
        heroSeqObserver = new IntersectionObserver((entries) => {
            const e = entries[0];
            if (e?.isIntersecting && !heroSequentialStarted) {
                heroSequentialStarted = true;
                void runHeroTextSequence();
            }
        }, { threshold: 0.06, rootMargin: "0px 0px 12% 0px" });
        heroSeqObserver.observe(heroRoot);
        queueMicrotask(tryHeroNow);
    }
    const aboutRoot = document.querySelector<HTMLElement>(".about-block--present");
    if (aboutRoot?.querySelector("[data-typewriter]")) {
        aboutSeqObserver = new IntersectionObserver((entries) => {
            const e = entries[0];
            if (e?.isIntersecting && !aboutSequentialStarted) {
                aboutSequentialStarted = true;
                void runAboutBioSequence();
            }
        }, { threshold: 0.1, rootMargin: "0px 0px -10% 0px" });
        aboutSeqObserver.observe(aboutRoot);
    }
    ac.signal.addEventListener("abort", () => {
        disconnectTextFX();
    });
}
