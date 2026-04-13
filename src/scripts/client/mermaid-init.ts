import { ScrollTrigger } from "./register-gsap";
let mermaidInitialized = false;
export async function initReadmeMermaid() {
    if (!document.querySelector(".readme-mermaid.mermaid"))
        return;
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
    }
    catch {
    }
}
