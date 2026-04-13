import { gsap } from "./register-gsap";
import { reduce, finePointer } from "./env";
const INTERACT_SEL = "a, button, [role='button'], input, textarea, select, .tile-action";
export let mouseX = 0;
export let mouseY = 0;
let sysClockTimer: ReturnType<typeof setInterval> | null = null;
export function killSysClock() {
    if (sysClockTimer) {
        clearInterval(sysClockTimer);
        sysClockTimer = null;
    }
}
export function initGlobalPointer(ac: AbortController) {
    document.addEventListener("pointermove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }, { passive: true, signal: ac.signal });
}
export function initParallax(ac: AbortController) {
    const el = document.querySelector<HTMLElement>("[data-parallax]");
    if (!el || reduce())
        return;
    const max = Number(el.dataset.parallaxMax ?? "14");
    const move = () => {
        const x = (mouseX / innerWidth - 0.5) * 2;
        const y = (mouseY / innerHeight - 0.5) * 2;
        el.style.transform = `translate3d(${x * max}px, ${y * max}px, 0)`;
    };
    document.addEventListener("pointermove", move, { passive: true, signal: ac.signal });
    move();
}
export function initSysClock() {
    killSysClock();
    const el = document.getElementById("sys-clock");
    if (!el)
        return;
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
    if (!reduce())
        sysClockTimer = setInterval(tick, 1000);
}
function normalizePathname(p: string): string {
    const x = p.replace(/\/$/, "");
    return x === "" ? "/" : x;
}
function hashForSamePageNav(href: string): string | null {
    try {
        const u = new URL(href, location.href);
        if (u.origin !== location.origin)
            return null;
        if (!u.hash)
            return null;
        if (normalizePathname(u.pathname) !== normalizePathname(location.pathname))
            return null;
        return u.hash;
    }
    catch {
        return null;
    }
}
export function initSmoothNav(ac: AbortController) {
    document.addEventListener("click", (e) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
        if (!a)
            return;
        const href = a.getAttribute("href");
        if (!href)
            return;
        const hash = hashForSamePageNav(href);
        if (!hash)
            return;
        const target = document.querySelector(hash);
        if (!target)
            return;
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
    }, { capture: true, signal: ac.signal });
}
export function initCursor(ac: AbortController) {
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
        if (!raf)
            raf = requestAnimationFrame(loop);
    };
    document.addEventListener("pointermove", schedule, { passive: true, signal: ac.signal });
    const setHover = (on: boolean) => {
        document.body.classList.toggle("cursor-hover", on);
    };
    document.addEventListener("mouseover", (e) => {
        const t = e.target as HTMLElement | null;
        if (!t)
            return;
        if (t.closest(INTERACT_SEL))
            setHover(true);
    }, { signal: ac.signal });
    document.addEventListener("mouseout", (e) => {
        const t = e.target as HTMLElement | null;
        const rel = e.relatedTarget as HTMLElement | null;
        if (!t?.closest(INTERACT_SEL))
            return;
        if (!rel?.closest(INTERACT_SEL))
            setHover(false);
    }, { signal: ac.signal });
    schedule();
}
