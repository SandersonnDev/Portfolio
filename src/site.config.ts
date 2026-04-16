import { withBase } from "./lib/paths";

/** Marques / logos (fichiers dans `public/`). */
export const brand = {
	placeholderLogo: withBase("logo-astro.svg"),
} as const;

export const site = {
	/** Libellé court (rail, onglet, copyright). */
	codename: "Sandersonn",
	displayName: "Alexandre Kouziaeff",
	role: "Concepteur·développeur d’interfaces, du print au web moderne",
	pitch:
		"Issu du design et de l'infographie, diplomé d'une licence CDUI, J'élabore des applications web du développement à la mise en production pour des ESN.",
	bio: [
		"Mon parcours commence en infographie et mise en page, sur une base de niveau bac : chaîne graphique, typographie, et supports print comme numériques.",
		"La licence Conception, développement et interfaces utilisateurs (CDUI) m'a fait passer du design à la conception d'interfaces et de livrables interactifs, ergonomique et mise en œuvre technique.",
		"En entreprise de services du numérique, j'interviens sur des sites (CMS, HTML/CSS), le support utilisateur et la refactorisation vers du code maison. J'ai aussi participé à la création d'un framework PHP/JS pour des sites orientés TPE et PME, avec une démarche (RSE), des gains sur les coûts et le trafic, et une intégration de contenu simplifiée.",
		"Les missions autour des sites statiques, de la Jamstack et du rendu (SSR) ont été le bon terrain pour consolider mon expérience en JavaScript, les pipelines de build, le déploiement et la performance côté front.",
		"Aujourd'hui je renforce Git, Docker, SQL et l'écosystème outillé pour livrer des solutions alignées sur les métiers. Je contribue aussi à des projets privés que je ne peux pas exposer ici.",
	],
	lien: [
		{
			href: "https://www.onisep.fr/ressources/univers-metier/metiers/ui-designer-concepteur-conceptrice-d-interface-utilisateur",
			label: "CDUI",
			tip: "Concepteur·développeur d’interfaces utilisateur : design d’interface + intégration + prototypage.",
		},
		{
			href: "https://www.economie.gouv.fr/entreprises/gerer-son-entreprise-au-quotidien/gerer-sa-comptabilite-et-ses-demarches/quest-ce-que-la-responsabilite-societale-des-entreprises-rse",
			label: "RSE",
			tip: "Responsabilité Sociétale des Entreprises : impact social, environnemental et éthique.",
		},
		{
			href: "https://www.bob-le-developpeur.com/notions/server-side-rendering-ssr",
			label: "SSR",
			tip: "Server-Side Rendering : rendu côté serveur, HTML prêt à l’affichage (SEO/perf selon cas).",
		},
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
	ctaProjects: "Aller aux projets",
	ctaProjectsTitle: "Aller à la section Projets",
	ctaEmail: "Envoyer un e-mail",
	ctaEmailTitle: "Envoyer un e-mail",
	ctaScrollAbout: "Aller à la section À propos",
	ctaScrollAboutTitle: "Aller à la section À propos",
	/** Flèche sous le hero : section suivante = projets (ordre de page). */
	ctaScrollProjects: "Aller aux projets",
	ctaScrollProjectsTitle: "Aller aux projets",
	/** Bouton hero (à la place du mail) : lien vers la section À propos. */
	ctaHeroAbout: "À propos",
	ctaHeroAboutTitle: "Aller à la section À propos",
	heroStatusSuffix: "en ligne",
	heroClockLabel: "Heure locale",
	/** Cartes projet accueil : fiche locale (infobulle = détail). */
	ctaViewFiche: "Voir plus",
	ctaViewSource: "GitHub",
	/** Cartes projet accueil : dépôt public (nouvel onglet). */
	ctaViewSourceFull: "Sur GitHub",
	tileTitleFiche: (projectTitle: string) =>
		`Fiche du projet « ${projectTitle} »`,
	tileTitleGithub: (projectTitle: string) =>
		`Dépôt GitHub « ${projectTitle} »`,
	/** Cartes accueil : rangée de badges Shields (topics / langages). */
	projectStackBadgesLabel: "Technologies du dépôt (topics ou langages GitHub)",
	builtWith: "Propulsé par Astro",
	railHome: "Retour en haut de page",
	railAbout: "Aller à la section À propos",
	railProjects: "Aller à la section Projets",
	railGithub: "Ouvrir le profil GitHub",
	/** Rail : bouton décoratif (thème désactivé). */
	railThemeGroup: "Élément décoratif",
	railThemeToggle: "Thème (désactivé, élément décoratif)",
	aboutMailTitle: "Envoyer un e-mail à l’adresse affichée",
	aboutGithubTitle: "Ouvrir le profil GitHub",
	aboutBlockPresent: "Présentation",
	aboutBlockStack: "Stack maîtrisée",
	aboutBlockContact: "Contact & réseaux",
	logoAstroTitle: "Astro framework utilisé pour ce site",
	railNavAria: "Navigation du portfolio",
	projectBackLabel: "Retour aux projets",
	projectBackTitle: "Revenir à la liste des projets",
	projectJournalHeading: "Notes & détails",
	projectDetailLinks: "Liens",
	projectDetailTech: "Technologies",
	projectNavAria: "Passer à une autre fiche projet",
	projectNavPrev: "Précédent",
	projectNavNext: "Suivant",
} as const;
