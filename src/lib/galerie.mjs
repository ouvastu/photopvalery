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
				for (const fichier of fichiersHtml(path.join(racine, 'blog'))) {
					const avant = fs.readFileSync(fichier, 'utf8');
					if (!avant.includes('photo-figure')) continue;
					const r = transformer(avant, dimensions);
					fs.writeFileSync(fichier, r.html);
					pages++;
					photos += r.photos;
				}
				logger.info(`${photos} photos mises en galerie dans ${pages} articles`);
			},
		},
	};
}
