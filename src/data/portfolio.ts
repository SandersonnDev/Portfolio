import type { Project } from "./project-model";
import { projects } from "./github-projects-source";

export type { ProjectSection, Project } from "./project-model";

export const site = {
	name: "KOUZIA",
	tagline: "Développeur web & applications",
	email: "kouziaeffa.pro@gmail.com",
};

/** Liens absolus pour que la nav fonctionne depuis /projets/… */
export const navLinks = [
	{ href: "/#about", label: "À propos" },
	{ href: "/#stack", label: "Stacks" },
	{ href: "/#projects", label: "Projets" },
	{ href: "/cv", label: "CV" },
	{ href: "/#contact", label: "Contact" },
] as const;

export const hero = {
	headline: "KOUZIA",
	headlineSplit: 3,
	subtitle: "Conception et développement d’interfaces et d’applications web modernes.",
	ctaPrimary: { label: "Voir les projets", href: "/#projects" },
	ctaSecondary: { label: "Contact", href: "/#contact" },
	ctaCv: { label: "CV", href: "/cv" },
};

/** Visuels à propos : URL absolue (ex. Unsplash) ou fichier dans /public/… */
export type AboutImageSlot = {
	src: string | null;
	alt: string;
	caption?: string;
};

/** Image de démo Unsplash (remplacez par vos fichiers locaux si besoin). */
const unsplash = (id: string, w = 1600, h = 1000) =>
	`https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

export const about = {
	title: "À propos",
	body: `Je conçois et développe des applications web et des interfaces utilisateur, du prototype à la mise en production. J’aime allier rigueur technique, performance et expérience utilisateur.`,
	image: {
		src: unsplash("photo-1522071820081-009f0129c71c", 1600, 1000),
		alt: "Équipe au travail sur un ordinateur portable",
		caption: "Visuel de démonstration (Unsplash) — à remplacer par votre photo.",
	} satisfies AboutImageSlot,
};

export const motivation = {
	title: "Motivation",
	body: `Ce qui me motive le plus, c’est de transformer une idée en produit utilisable : architecture claire, code maintenable et détails soignés côté front. Je continue d’explorer les outils et patterns qui permettent de livrer vite sans sacrifier la qualité.`,
};

export const skillCategories = [
	{
		id: "frontend",
		label: "Frontend",
		icon: "fa-solid fa-layer-group",
		items: ["TypeScript", "React", "Astro", "Tailwind CSS", "HTML / CSS sémantique"],
	},
	{
		id: "backend",
		label: "Backend",
		icon: "fa-solid fa-server",
		items: ["Node.js", "API REST", "Bases SQL", "Authentification & sécurité de base"],
	},
	{
		id: "tools",
		label: "Outils",
		icon: "fa-solid fa-toolbox",
		items: ["Git", "VS Code / Cursor", "Figma", "CI basique", "Linux"],
	},
] as const;

export { projects };

export function getProjectBySlug(slug: string): Project | undefined {
	return projects.find((p) => p.slug === slug);
}

export const contact = {
	title: "Contact",
	intro: "Pour un projet, une collaboration ou une question technique :",
	social: [
		{ label: "GitHub", href: "https://github.com/SandersonnDev", icon: "fa-brands fa-github" },
		{ label: "LinkedIn", href: "https://www.linkedin.com/in/KOUZIA", icon: "fa-brands fa-linkedin-in" },
	],
};

export const footer = {
	copyrightName: "KOUZIA",
	/** Arborescence du site (liens) */
	siteTree: [
		{ label: "Accueil", href: "/" },
		{ label: "À propos", href: "/#about" },
		{ label: "Stacks", href: "/#stack" },
		{ label: "Projets", href: "/#projects" },
		{ label: "CV", href: "/cv" },
		{ label: "Contact", href: "/#contact" },
	] as const,
	legal: [
		{ label: "Mentions légales", href: "/mentions-legales" },
		{ label: "Politique de confidentialité", href: "/politique-confidentialite" },
	] as const,
};
