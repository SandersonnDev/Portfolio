import SplitType from "split-type";
import type { SplitTypeOptions } from "split-type";
import { gsap, ScrollTrigger } from "./register-gsap";
import { reduce } from "./env";

const SPLIT_TYPE_OPTS: Partial<SplitTypeOptions> = {
	types: "lines,words",
	lineClass: "readme-split-line",
	wordClass: "readme-split-word",
};

const projectLineSplitInstances: SplitType[] = [];
const projectLineAnimations: gsap.core.Animation[] = [];
let lineRevealResizeTimer = 0;
function scheduleProjectLineRevealResize() {
    clearTimeout(lineRevealResizeTimer);
    lineRevealResizeTimer = window.setTimeout(() => {
        if (!projectLineSplitInstances.length)
            return;
        for (const s of projectLineSplitInstances) {
            try {
                s.split(SPLIT_TYPE_OPTS);
            }
            catch {
            }
        }
        ScrollTrigger.refresh();
    }, 160);
}
export function killProjectLineReveal() {
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
        }
        catch {
        }
    }
    projectLineSplitInstances.length = 0;
}
export function initProjectReadmeLineReveal(ac: AbortController) {
    killProjectLineReveal();
    if (!document.querySelector(".project-page") || reduce())
        return;
    const textSelectors = [
        ".project-page__lead",
        ".readme-content .readme-p",
        ".readme-content .readme-li",
        ".readme-content .readme-quote",
    ].join(", ");
    const textEls = [...document.querySelectorAll<HTMLElement>(`.project-page ${textSelectors}`)].filter((el) => (el.textContent?.trim().length ?? 0) > 0);
    const run = () => {
        for (const el of textEls) {
            const split = new SplitType(el, SPLIT_TYPE_OPTS);
            projectLineSplitInstances.push(split);
            const lines = split.lines;
            if (!lines?.length)
                continue;
            const sortedLines = [...lines].sort((a, b) => a.offsetTop - b.offsetTop || a.offsetLeft - b.offsetLeft);
            const lineWordGroups = sortedLines
                .map((line) => [...line.querySelectorAll<HTMLElement>(".readme-split-word")])
                .filter((words) => words.length > 0);
            if (!lineWordGroups.length)
                continue;
            const isLead = el.classList.contains("project-page__lead");
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
                tl.from(words, {
                    yPercent: 110,
                    opacity: 0,
                    duration,
                    stagger: wordStagger,
                    ease: "power3.out",
                }, first ? 0 : lineGap);
                first = false;
            }
            projectLineAnimations.push(tl);
        }
        const preWraps = [...document.querySelectorAll<HTMLElement>(".project-page .readme-pre-wrap")].filter((el) => (el.textContent?.trim().length ?? 0) > 0);
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
