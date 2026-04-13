import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
function githubPagesBase() {
    const repo = process.env.GITHUB_REPOSITORY;
    if (!repo)
        return "/";
    const [owner, name] = repo.split("/");
    if (!owner || !name)
        return "/";
    if (name.toLowerCase() === `${owner.toLowerCase()}.github.io`)
        return "/";
    return `/${name}/`;
}
function githubPagesSite() {
    const repo = process.env.GITHUB_REPOSITORY;
    if (!repo)
        return undefined;
    const [owner] = repo.split("/");
    return owner ? `https://${owner}.github.io` : undefined;
}
export default defineConfig({
    site: githubPagesSite(),
    base: githubPagesBase(),
    vite: {
        plugins: [tailwindcss()],
    },
});
