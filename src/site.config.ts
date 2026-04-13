import { withBase } from "./lib/paths";

/** Marques / logos (fichiers dans `public/`). */
export const brand = {
	/** Logo Astro (fusée officielle, tracé Simple Icons CC0 — `public/logo-astro.svg`). */
	placeholderLogo: withBase("logo-astro.svg"),
} as const;

/** Contenu (hors JSON GitHub). Aligné sur le CV (MonCV/CV). */
export const site = {
	/** Libellé court (rail, onglet, copyright). */
	codename: "Sandersonn",
	displayName: "Alexandre Kouziaeff",
	role: "Concepteur·développeur d’interfaces, du print au web moderne",
	pitch:
		"Issu de l’infographie et de la mise en page, diplômé en CDUI, je travaille en ESN sur des sites statiques et des stacks Jamstack, avec un renfort net sur JavaScript, TypeScript et l’écosystème associé.",
	bio: [
		"Mon parcours commence en infographie et mise en page, sur une base de niveau bac : chaîne graphique, typographie, et supports print comme numériques.",
		"La licence Conception, développement et univers interactifs (CDUI) m’a fait passer de la mise en page à la conception d’interfaces et de livrables interactifs, entre design, ergonomie et mise en œuvre technique.",
		"En entreprise de services du numérique, j’interviens sur des sites (CMS, HTML/CSS), le support utilisateur et la refactorisation vers du code maison. J’ai aussi participé à la création d'un framework PHP/JS pour des sites orientés TPE et PME, avec une démarche RSE (Responsabilité sociétale des entreprises), des gains sur les coûts et le trafic, et une intégration de contenu simplifiée.",
		"Les missions autour des sites statiques, du Jamstack et des générateurs de sites (SSG) ont été le bon terrain pour consolider JavaScript et TypeScript, les pipelines de build, le déploiement et la performance côté front.",
		"Aujourd’hui je renforce Git, Docker, SQL et l’écosystème outillé pour livrer des solutions alignées sur les métiers. Je contribue aussi à des projets privés que je ne peux pas exposer ici.",
	],
	email: "kouziaeffa.pro@gmail.com",
	/** Stack regroupée par famille (section À propos). */
	stackByCategory: [
		{
			category: "Intégration & contenus",
			items: [
				{ label: "HTML · CSS", icon: "fa-brands fa-html5" },
				{ label: "CMS", icon: "fa-brands fa-wordpress" },
				{ label: "Tailwind", icon: "fa-brands fa-tailwind-css" },
			],
		},
		{
			category: "Frameworks & build front",
			items: [
				{ label: "Astro", icon: "fa-solid fa-bolt" },
				/* Pas de marque « vite » dans Font Awesome Free ; éclair = build rapide, distinct d’Astro (fa-bolt). */
				{ label: "Vite", icon: "fa-solid fa-bolt-lightning" },
				{ label: "React", icon: "fa-brands fa-react" },
				{ label: "Electron", icon: "fa-solid fa-atom" },
			],
		},
		{
			category: "Langages & runtimes",
			items: [
				{ label: "JavaScript", icon: "fa-brands fa-js" },
				{ label: "TypeScript", icon: "fa-brands fa-js" },
				{ label: "Node.js", icon: "fa-brands fa-node-js" },
				{ label: "PHP", icon: "fa-brands fa-php" },
			],
		},
		{
			category: "APIs & données",
			items: [
				{ label: "REST API", icon: "fa-solid fa-code" },
				{ label: "WebSocket", icon: "fa-solid fa-code" },
				{ label: "SQL", icon: "fa-solid fa-database" },
			],
		},
		{
			category: "Infra & outillage",
			items: [
				{ label: "Docker", icon: "fa-brands fa-docker" },
				{ label: "Proxmox", icon: "fa-solid fa-code" },
				{ label: "Git", icon: "fa-brands fa-git-alt" },
			],
		},
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
	/** Flèche sous le hero : section suivante = projets (ordre de page). */
	ctaScrollProjects: "Descendre aux projets",
	ctaScrollProjectsTitle: "Faire défiler vers la liste des projets",
	/** Bouton hero (à la place du mail) : lien vers la section À propos. */
	ctaHeroAbout: "À propos",
	ctaHeroAboutTitle: "Aller à la section À propos : présentation, technologies et contact",
	heroStatusSuffix: "en ligne",
	heroClockLabel: "Heure locale",
	/** Cartes projet accueil : fiche locale (infobulle = détail). */
	ctaViewFiche: "Fiche ici",
	ctaViewSource: "GitHub",
	/** Cartes projet accueil : dépôt public (nouvel onglet). */
	ctaViewSourceFull: "Sur GitHub",
	tileTitleFiche: (projectTitle: string) =>
		`Fiche du projet « ${projectTitle} » sur ce portfolio (description, README, stack)`,
	tileTitleGithub: (projectTitle: string) =>
		`Dépôt GitHub « ${projectTitle} » — ouverture dans un nouvel onglet`,
	/** Cartes accueil : rangée de badges Shields (topics / langages). */
	projectStackBadgesLabel: "Technologies du dépôt (topics ou langages GitHub)",
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
	logoAstroTitle: "Astro — framework utilisé pour ce site",
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
