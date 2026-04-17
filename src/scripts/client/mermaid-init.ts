import { ScrollTrigger } from "./register-gsap";
import { getTheme } from "./theme-toggle";

let mermaidInitialized = false;

const MERMAID_DARK = {
	theme: "dark" as const,
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
};

const MERMAID_LIGHT = {
	theme: "default" as const,
	themeVariables: {
		background: "#f4f4f5",
		mainBkg: "#e4e4e7",
		textColor: "#1c1917",
		primaryColor: "#eef2ff",
		primaryTextColor: "#312e81",
		primaryBorderColor: "#6366f1",
		lineColor: "#57534e",
		secondaryColor: "#e4e4e7",
		tertiaryColor: "#f4f4f5",
		fontFamily: '"Share Tech Mono", ui-monospace, monospace',
	},
};

export async function initReadmeMermaid() {
	if (!document.querySelector(".readme-mermaid.mermaid"))
		return;
	const { default: mermaid } = await import("mermaid");
	if (!mermaidInitialized) {
		const light = getTheme() === "light";
		const cfg = light ? MERMAID_LIGHT : MERMAID_DARK;
		mermaid.initialize({
			startOnLoad: false,
			theme: cfg.theme,
			securityLevel: "loose",
			themeVariables: cfg.themeVariables,
		});
		mermaidInitialized = true;
	}
	try {
		await mermaid.run({
			querySelector: ".readme-mermaid.mermaid",
			suppressErrors: true,
		});
		requestAnimationFrame(() => ScrollTrigger.refresh());
	}
	catch {
	}
}
