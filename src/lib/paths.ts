/**
 * Préfixe les chemins internes avec `import.meta.env.BASE_URL` (`/` en local, `/Portfolio/` sur GitHub Pages projet).
 */
export function withBase(path: string): string {
	const b = import.meta.env.BASE_URL;
	if (path === "" || path === "/") return b;
	const s = path.startsWith("/") ? path.slice(1) : path;
	return `${b}${s}`;
}
