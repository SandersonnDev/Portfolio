import * as THREE from "three";

// HomeHero importe `startHeroThree` et passe le <canvas> du layout (accueil).

// ---------------------------------------------------------------------------
// Constantes (grille + ondes + poussée curseur)
// ---------------------------------------------------------------------------
// Nombre de points par rangée / colonne (grille carrée).
const NOMBRE_MAILLES = 100;
// Largeur du carré couvert en monde (axe x et z).
const LARGEUR_GRILLE = 5;
// Amplitude de la forme au repos (cos + sin) : plus petit = plus plat.
const AMPLITUDE_INITIALE = 0.028;
// Fréquence spatiale de cette forme initiale.
const FREQUENCE_INITIALE = 1.1;
// Amplitude de l’onde animée dans le temps.
const AMPLITUDE_ONDE = 0.042;
// Fréquence moyenne de l’onde animée.
const FREQUENCE_CENTRALE = 0.12;
// Combien la fréquence oscille autour de la moyenne.
const OSCILLATION_FREQUENCE = 0.12;
// Déplacement max en xz quand le curseur est tout proche.
const AMPLITUDE_POUSSEE = 0.18;
// Largeur de la “bulle” d’influence du curseur (gaussienne).
const PORTEE_CURSEUR = 0.42;

// ---------------------------------------------------------------------------
// Couleurs lues depuis le CSS du thème
// ---------------------------------------------------------------------------
// Trois couleurs Three mises à jour depuis les variables CSS.
let palette = { accent: new THREE.Color(), dim: new THREE.Color(), amber: new THREE.Color() };
// true = thème clair (`data-theme="light"`), false = sombre ou défaut — pour relever un peu les points au sombre.
let themeEstClair = false;
// Réutilisé pour le léger éclaircissement sombre (évite un `new` par sommet / frame).
const couleurBlanc = new THREE.Color(1, 1, 1);

// Aucun paramètre : lit `--accent`, `--fg-dim`, `--amber` sur `document.documentElement`.
function refreshPaletteFromCss() {
	// Racine du document (là où sont les variables CSS).
	const root = document.documentElement;
	themeEstClair = root.getAttribute("data-theme") === "light";
	// Styles calculés après application du thème.
	const s = getComputedStyle(root);
	// Lit une propriété `--nom` et renvoie une THREE.Color (gris si vide ou invalide).
	const read = (name) => {
		const raw = s.getPropertyValue(name).trim();
		if (!raw) return new THREE.Color(0x888888);
		try {
			return new THREE.Color(raw);
		} catch {
			return new THREE.Color(0x888888);
		}
	};
	// Copie dans le cache (évite de recréer des Color à chaque frame).
	palette.accent.copy(read("--accent"));
	palette.dim.copy(read("--fg-dim"));
	palette.amber.copy(read("--amber"));
}

// i, j : indices sur la grille (0 … nb-1).
// nb : nombre de mailles sur un côté (ici NOMBRE_MAILLES).
// intensity : facteur pour assombrir / éclaircir (lié à la hauteur du point).
// Retour : une THREE.Color pour l’attribut `color` du sommet (vertexColors).
function applyVertexColor(i, j, nb, intensity) {
	// Position normalisée sur l’axe “colonnes” (pour mélanger accent → dim).
	const mixH = j / (nb - 1 || 1);
	// Position normalisée sur l’axe “lignes” (pour ajouter un peu d’ambre).
	const mixV = i / (nb - 1 || 1);
	// Départ accent, interpolation vers dim selon mixH.
	const c = new THREE.Color().copy(palette.accent).lerp(palette.dim, mixH * 0.55);
	// Touche d’ambre selon mixV.
	c.lerp(palette.amber, mixV * 0.22);
	// Gain borné pour ne pas cramer les couleurs.
	const gain = THREE.MathUtils.clamp(intensity * 0.72 + 0.18, 0.12, 1.15);
	c.multiplyScalar(gain);
	// Thème sombre : accent / dim sont sombres sur fond void — léger lift vers le blanc pour la grille visible en haut du hero.
	if (!themeEstClair) c.lerp(couleurBlanc, 0.14);
	return c;
}

// canvas : le <canvas> fixe plein écran (layout) ; tout le WebGL s’y dessine.
export function startHeroThree(canvas) {
	// Largeur du canvas en pixels (pour la caméra et le renderer).
	let iw = canvas.clientWidth;
	// Hauteur du canvas (min 1 pour éviter division par zéro).
	let ih = Math.max(canvas.clientHeight, 2);

	// Première lecture des couleurs depuis le thème actuel.
	refreshPaletteFromCss();
	// Quand on bascule clair / sombre sur `<html data-theme>`, on relit le CSS.
	const themeObserver = new MutationObserver(() => refreshPaletteFromCss());
	themeObserver.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["data-theme"],
	});

	//Scene
	const scene = new THREE.Scene();

	//Camera (fov°, ratio largeur/hauteur, près, loin)
	const camera = new THREE.PerspectiveCamera(60, iw / ih, 0.1, 100);

	//Geometry (grille de points + couleurs initiales)
	const geometry = computeGeometry();

	//Material (petits points, couleur par sommet)
	const material = new THREE.PointsMaterial({ size: 0.007, vertexColors: true });

	//Mesh
	const mesh = new THREE.Points(geometry, material);

	//Ajout du mesh à la scène
	scene.add(mesh);

	//Camera Position
	camera.position.set(0, 1.5, 0);
	//Point regardé par la caméra
	camera.lookAt(0, -1, 0);

	//Moteur de rendu sur la balise canvas
	const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
	//Fond transparent entre les points (dégradé CSS visible derrière)
	renderer.setClearColor(0x000000, 0);

	// Lance un rayon depuis la souris pour trouver (x,z) du curseur sur le plan y=0.
	const raycaster = new THREE.Raycaster();
	// Coordonnées normalisées -1…1 pour setFromCamera.
	const ndc = new THREE.Vector2();
	// Point d’intersection rayon / plan (réutilisé pour éviter des new à la volée).
	const hit = new THREE.Vector3();
	// Plan horizontal y = 0 (là où on projette le curseur).
	const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
	// true si le pointeur est sur le canvas et le rayon touche le plan.
	let hasPointer = false;
	// Position monde (x,0,z) sous le curseur.
	const cursor = new THREE.Vector3(0, 0, 0);

	// ev : événement pointermove du navigateur (clientX / clientY en pixels écran).
	function onPointerMove(ev) {
		// Rectangle du canvas à l’écran (fixe plein viewport sur l’accueil).
		const rect = canvas.getBoundingClientRect();
		// Hors du canvas : pas de poussée.
		if (
			ev.clientX < rect.left ||
			ev.clientX > rect.right ||
			ev.clientY < rect.top ||
			ev.clientY > rect.bottom
		) {
			hasPointer = false;
			return;
		}
		hasPointer = true;
		// NDC x : gauche du canvas = -1, droite = +1.
		ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
		// NDC y : bas du canvas = -1, haut = +1 (repère OpenGL).
		ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
		// Rayon depuis la caméra passant par ce pixel.
		raycaster.setFromCamera(ndc, camera);
		// Intersection avec le plan y=0 ; null si rayon parallèle au plan.
		const hitPt = raycaster.ray.intersectPlane(planeY, hit);
		if (hitPt === null) hasPointer = false;
		// Sinon on garde le point touché comme centre de poussée.
		else cursor.copy(hit);
	}
	// Écoute globale : le canvas peut être pointer-events-none, le window reçoit quand même les moves.
	window.addEventListener("pointermove", onPointerMove, { passive: true });

	// Aucun paramètre : recolle la taille du renderer au canvas + ratio caméra.
	function syncSize() {
		iw = canvas.clientWidth;
		ih = Math.max(canvas.clientHeight, 1);
		// Limite le DPR pour la perf (max 2).
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		renderer.setPixelRatio(dpr);
		// Taille du buffer WebGL = taille CSS du canvas.
		renderer.setSize(iw, ih, false);
		// Même ratio pour la PerspectiveCamera.
		camera.aspect = iw / ih;
		camera.updateProjectionMatrix();
	}

	//Horloge
	const clock = new THREE.Clock();
	//Temps (secondes cumulées pour l’animation)
	let t = 0;

	window.addEventListener("resize", syncSize);
	// Première taille correcte tout de suite.
	syncSize();

	//Boucle de l'animation
	loop();

	// Aucun paramètre : une frame ; rappelée par requestAnimationFrame.
	function loop() {
		// Delta depuis la frame précédente (secondes).
		t += clock.getDelta();
		// Met à jour positions + couleurs des sommets.
		animeGeometry(geometry, t);
		// Dessine la scène dans le canvas.
		renderer.render(scene, camera);
		// Frame suivante.
		requestAnimationFrame(loop);
	}

	// Aucun paramètre : construit la BufferGeometry une seule fois au démarrage.
	// Retour : géométrie avec attributs `position` et `color` (3 floats par sommet).
	function computeGeometry() {
		// 2π pour les cos / sin.
		const pi2 = Math.PI * 2;

		const geom = new THREE.BufferGeometry();

		// Un float par coordonnée (x,y,z) × nombre de sommets.
		const positions = new Float32Array(NOMBRE_MAILLES * NOMBRE_MAILLES * 3);
		const colors = new Float32Array(NOMBRE_MAILLES * NOMBRE_MAILLES * 3);

		// Indice linéaire du sommet dans les tableaux.
		let k = 0;
		for (let i = 0; i < NOMBRE_MAILLES; i++) {
			for (let j = 0; j < NOMBRE_MAILLES; j++) {
				// Coordonnées x,z régulières sur le carré [-L/2 , +L/2].
				const x = i * (LARGEUR_GRILLE / NOMBRE_MAILLES) - LARGEUR_GRILLE / 2;
				const z = j * (LARGEUR_GRILLE / NOMBRE_MAILLES) - LARGEUR_GRILLE / 2;
				// Hauteur y d’une petite onde statique au départ.
				const y =
					AMPLITUDE_INITIALE *
					(Math.cos(x * pi2 * FREQUENCE_INITIALE) + Math.sin(z * pi2 * FREQUENCE_INITIALE));
				positions[3 * k + 0] = x;
				positions[3 * k + 1] = y;
				positions[3 * k + 2] = z;
				// Intensité pour la couleur (liée à la hauteur relative).
				const intensity =
					AMPLITUDE_INITIALE > 1e-6 ? (y / AMPLITUDE_INITIALE) / 2 + 0.3 : 0.35;
				const c = applyVertexColor(i, j, NOMBRE_MAILLES, intensity);
				colors[3 * k + 0] = c.r;
				colors[3 * k + 1] = c.g;
				colors[3 * k + 2] = c.b;
				k++;
			}
		}
		// Attache les buffers à la géométrie (3 composantes par sommet).
		geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
		geom.computeBoundingBox();
		return geom;
	}

	// geom : la BufferGeometry des points (positions + couleurs).
	// progress : temps en secondes (ici `t` de la boucle) pour animer phase et fréquence.
	function animeGeometry(geom, progress) {
		const pi2 = Math.PI * 2;
		// Décale la phase dans le temps (un peu ralenti vs `progress` brut).
		const phase = progress * 0.85;
		// Fréquence qui respire lentement.
		const fre = FREQUENCE_CENTRALE + Math.cos(progress * 0.55) * OSCILLATION_FREQUENCE;

		let k = 0;
		for (let i = 0; i < NOMBRE_MAILLES; i++) {
			for (let j = 0; j < NOMBRE_MAILLES; j++) {
				// Position de référence sur la grille (sans poussée).
				const xBase = i * (LARGEUR_GRILLE / NOMBRE_MAILLES) - LARGEUR_GRILLE / 2;
				const zBase = j * (LARGEUR_GRILLE / NOMBRE_MAILLES) - LARGEUR_GRILLE / 2;
				// Hauteur d’onde animée (cos + sin) à partir de la grille de base.
				let y =
					AMPLITUDE_ONDE *
					(Math.cos(xBase * pi2 * fre + phase) + Math.sin(zBase * pi2 * fre + phase));

				// Position finale en x,z (repoussement curseur en xz).
				let xFin = xBase;
				let zFin = zBase;
				if (hasPointer) {
					// Vecteur du curseur vers le point (plan xz).
					const dx = xBase - cursor.x;
					const dz = zBase - cursor.z;
					const dist2 = dx * dx + dz * dz;
					// Sous le curseur exact : pas de direction, on évite division par 0.
					if (dist2 > 1e-8) {
						const dist = Math.sqrt(dist2);
						// Plus on est loin du curseur, plus c’est faible (gaussienne).
						const gauss = Math.exp(-dist2 / (PORTEE_CURSEUR * PORTEE_CURSEUR));
						// Direction unitaire qui éloigne du curseur.
						const ux = dx / dist;
						const uz = dz / dist;
						// Amplitude du déplacement selon la distance au curseur.
						const decalage = AMPLITUDE_POUSSEE * gauss;
						xFin = xBase + ux * decalage;
						zFin = zBase + uz * decalage;
					}
				}

				geom.attributes.position.setXYZ(k, xFin, y, zFin);
				// Normalise un peu l’intensité couleur quand y varie.
				const denom = Math.max(AMPLITUDE_ONDE + AMPLITUDE_POUSSEE, 1e-4);
				const intensity = THREE.MathUtils.clamp((y / denom) * 0.35 + 0.45, 0.2, 1);
				const c = applyVertexColor(i, j, NOMBRE_MAILLES, intensity);
				geom.attributes.color.setXYZ(k, c.r, c.g, c.b);
				k++;
			}
		}
		// Indique à Three que les buffers CPU ont changé.
		geom.attributes.position.needsUpdate = true;
		geom.attributes.color.needsUpdate = true;
	}
}
