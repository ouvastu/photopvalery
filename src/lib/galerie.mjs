// Transforme, après la compilation, les photos des articles en galeries,
// comme les blocs « Galerie » de l'ancien blog WordPress :
// - les <figure class="photo-figure"> consécutives sont regroupées dans <div class="galerie"> ;
// - la grille affiche une vignette WebP légère (public/vignettes, voir scripts/vignettes.mjs) ;
// - la photo d'origine (public/images) reste dans data-full pour la visionneuse ;
// - width/height évitent les sauts de mise en page, les panoramas prennent toute la ligne.
// Passe par le HTML final pour ne pas dépendre du moteur Markdown d'Astro.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RATIO_PANORAMA = 1.9;
const FIGURE = /<figure class="photo-figure"><img ([^>]*?)\s*\/?>([\s\S]*?)<\/figure>/g;
const SUITE_DE_FIGURES = /(?:<figure class="photo-figure[^"]*">[\s\S]*?<\/figure>\s*)+/g;

export function transformer(html, dimensions) {
	let n = 0;
	const avecVignettes = html.replace(FIGURE, (tout, attributs, reste) => {
		const src = attributs.match(/\bsrc="([^"]+)"/)?.[1];
		if (!src?.startsWith('/images/')) return tout;
		const nom = decodeURIComponent(src.slice('/images/'.length));
		const dim = dimensions[nom];
		if (!dim) return tout;
		n++;
		const vignette = '/vignettes/' + encodeURIComponent(nom.replace(/\.[^.]+$/, '.webp'));
		const autres = attributs
			.replace(/\bsrc="[^"]*"\s*/, '')
			.replace(/\b(loading|decoding|width|height)="[^"]*"\s*/g, '')
			.trim();
		const classe = dim.w / dim.h >= RATIO_PANORAMA ? 'photo-figure panorama' : 'photo-figure';
		return `<figure class="${classe}"><img src="${vignette}" data-full="${src}" width="${dim.w}" height="${dim.h}" ${autres} loading="lazy" decoding="async">${reste}</figure>`;
	});
	const resultat = avecVignettes.replace(SUITE_DE_FIGURES, (suite) => {
		const fin = suite.match(/\s*$/)[0];
		return `<div class="galerie">${suite.slice(0, suite.length - fin.length)}</div>${fin}`;
	});
	return { html: resultat, photos: n };
}


// Sommaire illustré en tête d'article : une carte par section
// (<h2 class="section-photos" id="…">, avec data-lien quand la section renvoie à un autre article).
const SECTION = /<h2 class="section-photos" id="([^"]+)"( data-lien="([^"]+)")?>([\s\S]*?)<\/h2>/g;
const EMPLACEMENT = /(<nav class="sommaire-photos"[^>]*>)\s*(<\/nav>)/;

function resumePhotos(html) {
	const photos = html.match(/data-full="/g)?.length ?? 0;
	const premiere = html.match(/<img src="(\/vignettes\/[^"]+)" data-full="[^"]+" width="(\d+)" height="(\d+)"/);
	return { photos, vignette: premiere?.[1], w: premiere?.[2], h: premiere?.[3] };
}

const echapper = (t) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const pluriel = (n) => `${n} photo${n > 1 ? "s" : ""}`;

export function ajouterSommaire(html, lirePage) {
	if (!EMPLACEMENT.test(html)) return html;
	const titres = [...html.matchAll(SECTION)];
	if (titres.length < 2) return html;
	const finArticle = html.indexOf("</article>");
	const cartes = titres.map((t, i) => {
		const [, id, , lien, titre] = t;
		const debut = t.index + t[0].length;
		const fin = i + 1 < titres.length ? titres[i + 1].index : finArticle;
		let r = resumePhotos(html.slice(debut, fin));
		let href = `#${id}`;
		let compte = pluriel(r.photos);
		if (lien && r.photos === 0) {
			const autre = lirePage(lien);
			if (autre) r = resumePhotos(autre);
			href = lien;
			compte = r.photos ? `Reportage séparé · ${pluriel(r.photos)}` : "Reportage séparé";
		}
		const image = r.vignette
			? `<img src="${r.vignette}" width="${r.w}" height="${r.h}" alt="" loading="eager" decoding="async">`
			: "";
		return `<a class="sommaire-carte" href="${href}">${image}<span class="sommaire-titre">${titre.trim()}</span><span class="sommaire-compte">${echapper(compte)}</span></a>`;
	});
	// Le sommaire se place après le texte d'introduction, juste avant la première section.
	const [, ouverture, fermeture] = html.match(EMPLACEMENT);
	const sans = html.replace(EMPLACEMENT, "");
	const i = sans.search(/<h2 class="section-photos"/);
	return sans.slice(0, i) + `${ouverture}<p class="sommaire-intro">Les photographies</p><div class="sommaire-cartes">${cartes.join("")}</div>${fermeture}` + sans.slice(i);
}

function fichiersHtml(dossier) {
	return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
		const p = path.join(dossier, e.name);
		return e.isDirectory() ? fichiersHtml(p) : e.name.endsWith('.html') ? [p] : [];
	});
}

export default function galerie() {
	return {
		name: 'galeries-photos',
		hooks: {
			'astro:build:done': ({ dir, logger }) => {
				const racine = fileURLToPath(dir);
				const dimensions = JSON.parse(
					fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'photos.json'), 'utf8')
				);
				let pages = 0;
				let photos = 0;
				const fichiers = fichiersHtml(path.join(racine, 'blog'));
				for (const fichier of fichiers) {
					const avant = fs.readFileSync(fichier, 'utf8');
					if (!avant.includes('photo-figure')) continue;
					const r = transformer(avant, dimensions);
					fs.writeFileSync(fichier, r.html);
					pages++;
					photos += r.photos;
				}
				// Deuxième passage : les sommaires peuvent citer un autre article déjà transformé.
				const lirePage = (lien) => {
					const p = path.join(racine, ...lien.split('/').filter(Boolean), 'index.html');
					return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
				};
				let sommaires = 0;
				for (const fichier of fichiers) {
					const avant = fs.readFileSync(fichier, 'utf8');
					const apres = ajouterSommaire(avant, lirePage);
					if (apres !== avant) {
						fs.writeFileSync(fichier, apres);
						sommaires++;
					}
				}
				logger.info(`${photos} photos mises en galerie dans ${pages} articles, ${sommaires} sommaires`);
			},
		},
	};
}
