// Applique des textes alternatifs (et légendes) rédigés à la main à un article.
// Usage : node scripts/appliquer-alt.mjs <slug> "<contexte>"
//   scripts/alt-expositions/<slug>.txt : une description par ligne, dans l'ordre des photos.
//   Texte final : « description — contexte — © Gilles Hutchinson ».
import fs from 'node:fs';

const [slug, contexte] = process.argv.slice(2);
if (!slug || !contexte) throw new Error('Usage : node scripts/appliquer-alt.mjs <slug> "<contexte>"');

const descriptions = fs
	.readFileSync(`scripts/alt-expositions/${slug}.txt`, 'utf8')
	.split(/\r?\n/)
	.map((l) => l.trim())
	.filter(Boolean);
const doublons = descriptions.filter((d, i) => descriptions.indexOf(d) !== i);
if (doublons.length) throw new Error('Descriptions en double : ' + doublons.join(' | '));

const fichier = `src/content/blog/${slug}.md`;
let texte = fs.readFileSync(fichier, 'utf8');
const echapper = (t) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

let i = 0;
texte = texte.replace(
	/<figure class="photo-figure"><img src="([^"]+)" alt="[^"]*"([^>]*)>(?:<figcaption>[\s\S]*?<\/figcaption>)?<\/figure>/g,
	(tout, src, reste) => {
		const d = descriptions[i++];
		if (!d) throw new Error(`Pas assez de descriptions (${descriptions.length})`);
		const t = echapper(`${d} — ${contexte} — © Gilles Hutchinson`);
		return `<figure class="photo-figure"><img src="${src}" alt="${t}"${reste}><figcaption>${t}</figcaption></figure>`;
	}
);
if (i !== descriptions.length) throw new Error(`${i} photos pour ${descriptions.length} descriptions`);
fs.writeFileSync(fichier, texte);
console.log(`${slug} : ${i} photos mises à jour`);
