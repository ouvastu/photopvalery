// Génère les vignettes WebP des galeries et le fichier des dimensions des photos.
// Usage : npm run vignettes   (ne traite que les photos nouvelles ou modifiées)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const racine = process.cwd();
const dossierPhotos = path.join(racine, 'public', 'images');
const dossierVignettes = path.join(racine, 'public', 'vignettes');
const fichierDimensions = path.join(racine, 'src', 'data', 'photos.json');

const LARGEUR = 700;
const QUALITE = 70;

fs.mkdirSync(dossierVignettes, { recursive: true });
fs.mkdirSync(path.dirname(fichierDimensions), { recursive: true });

const dimensions = fs.existsSync(fichierDimensions)
	? JSON.parse(fs.readFileSync(fichierDimensions, 'utf8'))
	: {};

const photos = fs.readdirSync(dossierPhotos).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
let crees = 0;

for (const nom of photos) {
	const source = path.join(dossierPhotos, nom);
	const cible = path.join(dossierVignettes, nom.replace(/\.[^.]+$/, '.webp'));
	const aJour =
		fs.existsSync(cible) &&
		dimensions[nom] &&
		fs.statSync(cible).mtimeMs >= fs.statSync(source).mtimeMs;
	if (aJour) continue;

	const image = sharp(source).rotate();
	const { width, height } = await image.metadata();
	dimensions[nom] = { w: width, h: height };
	await image
		.resize({ width: LARGEUR, withoutEnlargement: true })
		.webp({ quality: QUALITE })
		.toFile(cible);
	crees++;
	if (crees % 200 === 0) console.log(`${crees} vignettes…`);
}

// Retire les entrées des photos supprimées
for (const nom of Object.keys(dimensions)) if (!photos.includes(nom)) delete dimensions[nom];

const trie = Object.fromEntries(Object.entries(dimensions).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(fichierDimensions, JSON.stringify(trie) + '\n');
console.log(`${crees} vignette(s) créée(s), ${photos.length} photos au total.`);
