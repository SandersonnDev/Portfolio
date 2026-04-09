import { withBase } from "./lib/paths";

/** Marques / logos (placeholders, remplacer par vos fichiers). */
export const brand = {
	/** Logo Astro en attendant vos assets (fichier dans `public/`). */
	placeholderLogo: withBase("logo-astro.svg"),
} as const;

/** Contenu (hors JSON GitHub). Aligné sur le CV (MonCV/CV). */
export const site = {
	/** Libellé court (rail, onglet, copyright). */
	codename: "Sandersonn",
	displayName: "Alexandre Kouziaeff",
	role: "Concepteur développeur d’applications web · alternance CDA",
	pitch:
		"Titulaire d’une licence CDUI et en formation CDA à l’ENI, je recherche une alternance en conception et développement d’applications : du support utilisateur sur le terrain aux interfaces web utiles et ergonomiques.",
	bio: [
		"Parcours tourné vers le support utilisateur, les sites (CMS, HTML/CSS) et la refactorisation vers du code maison.",
		"J’ai aussi participé à la création d’un framework PHP/JS pour des sites adaptés aux TPE et PME, avec une démarche RSE, une réduction des coûts, une meilleure gestion du trafic et une intégration de contenu plus simple.",
		"Je renforce mes compétences en JavaScript/TypeScript et dans l’écosystème outillé (Git, Docker, SQL) pour livrer des solutions alignées sur les métiers.",
		"Je suis aussi contributeur de projets privés que je ne peux pas dévoiler ici.",
	],
	email: "kouziaeffa.pro@gmail.com",
	stack: [
		{ label: "HTML · CSS", icon: "fa-brands fa-html5" },
		{ label: "CMS", icon: "fa-brands fa-wordpress" },
		{ label: "Astro", icon: "fa-solid fa-bolt" },
		{ label: "Vite", icon: "fa-brands fa-vite" },
		{ label: "Tailwind", icon: "fa-brands fa-tailwind" },
		{ label: "Electron", icon: "fa-brands fa-electron" },
		{ label: "REST API", icon: "fa-solid fa-code" },
		{ label: "WebSocket", icon: "fa-solid fa-code" },
		{ label: "JavaScript", icon: "fa-solid fa-code" },
		{ label: "TypeScript", icon: "fa-brands fa-typescript" },
		{ label: "Node.js", icon: "fa-brands fa-node-js" },
		{ label: "React", icon: "fa-brands fa-react" },
		{ label: "PHP", icon: "fa-brands fa-php" },
		{ label: "Docker", icon: "fa-brands fa-docker" },
		{ label: "Proxmox", icon: "fa-brands fa-proxmox" },
		{ label: "Git", icon: "fa-brands fa-git-alt" },
		{ label: "SQL", icon: "fa-solid fa-database" },
	] as const,
} as const;

/** Libellés et infobulles (FR). */
export const copy = {
	ctaProjects: "Voir les projets",
	ctaProjectsTitle: "Descendre à la section listant les dépôts GitHub synchronisés",
	ctaEmail: "M’écrire par e-mail",
	ctaEmailTitle: "Ouvre votre messagerie pour envoyer un e-mail",
	ctaScrollAbout: "Descendre à la section À propos",
	ctaScrollAboutTitle: "Fait défiler la page vers la section identité et stack",
	/** Bouton hero (à la place du mail) : lien vers la section À propos. */
	ctaHeroAbout: "À propos",
	ctaHeroAboutTitle: "Aller à la section À propos : présentation, technologies et contact",
	heroStatusSuffix: "en ligne",
	heroClockLabel: "Heure locale",
	ctaViewFiche: "Voir la fiche",
	ctaViewSource: "Code source",
	ctaViewSourceFull: "Code source (GitHub)",
	tileTitleFiche: (projectTitle: string) =>
		`Ouvre la page détaillée du projet « ${projectTitle} » sur ce portfolio`,
	tileTitleGithub: (projectTitle: string) =>
		`Ouvre le dépôt GitHub du projet « ${projectTitle} » dans un nouvel onglet`,
	footerTagline: "Portfolio statique · synchronisation GitHub",
	builtWith: "Propulsé par Astro",
	railHome: "Retour en haut de page (section d’accueil)",
	railAbout: "Aller à la section À propos",
	railProjects: "Aller à la section Projets",
	railGithub: "Ouvrir le profil GitHub dans un nouvel onglet",
	aboutMailTitle: "Envoyer un e-mail à l’adresse affichée",
	aboutGithubTitle: "Ouvrir le profil GitHub dans un nouvel onglet",
	aboutBlockPresent: "Présentation",
	aboutBlockStack: "Stack maîtrisée",
	aboutBlockContact: "Contact & réseaux",
	logoAstroTitle: "Logo Astro (placeholder, à remplacer par votre identité visuelle)",
	railNavAria: "Navigation du portfolio",
	projectBackLabel: "Retour aux projets",
	projectBackTitle: "Revenir à la liste des projets sur l’accueil",
	projectJournalHeading: "Notes & détails",
	projectDetailLinks: "Liens",
	projectDetailTech: "Technologies",
	projectReadmeIntro: "Contenu issu du README du dépôt.",
	projectNavAria: "Passer à une autre fiche projet",
	projectNavPrev: "Précédent",
	projectNavNext: "Suivant",
} as const;
