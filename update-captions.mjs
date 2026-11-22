import fs from 'node:fs';
import path from 'node:path';

const blogDir = path.join(process.cwd(), 'src', 'content', 'blog');
const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.md'));

let totalPhotos = 0;

for (const file of files) {
	const filePath = path.join(blogDir, file);
	const content = fs.readFileSync(filePath, 'utf-8');

	// Sépare l'en-tête (frontmatter) du contenu de l'article
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) continue;

	const frontmatter = match[1];
	let body = match[2];

	// Récupère le titre de l'exposition
	const titleMatch = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m);
	const expoTitle = titleMatch ? titleMatch[1].replace(/["']/g, '').trim() : file.replace('.md', '');

	let index = 0;

	// 1. Traite les images au format Markdown : ![alt](url)
	body = body.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, oldAlt, src) => {
		index++;
		totalPhotos++;

		// Conserve l'ancien texte s'il est descriptif (pas vide ni un nom de fichier)
		const cleanOld = oldAlt.trim();
		const isGeneric = !cleanOld || /\.(jpe?g|png|webp|gif)$/i.test(cleanOld) || /^(img|dsc|photo|image)[-_]?\d+/i.test(cleanOld);

		const captionText = isGeneric
			? `${expoTitle} — Photographie n°${index} — © Gilles Hutchinson`
			: `${cleanOld} — ${expoTitle} — © Gilles Hutchinson`;

		const safeAlt = captionText.replace(/"/g, '&quot;');

		return `<figure class="photo-figure"><img src="${src}" alt="${safeAlt}" loading="lazy" /><figcaption>${captionText}</figcaption></figure>`;
	});

	// 2. Traite les balises <img> isolées qui n'ont pas encore d'alt propre
	body = body.replace(/<img\b([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (fullTag, before, src, after) => {
		if (fullTag.includes('© Gilles Hutchinson')) return fullTag;
		index++;
		totalPhotos++;

		const captionText = `${expoTitle} — Photographie n°${index} — © Gilles Hutchinson`;
		const safeAlt = captionText.replace(/"/g, '&quot;');

		// Supprime un éventuel ancien alt vide ou générique
		const cleaned = `${before} ${after}`.replace(/\balt=["'][^"']*["']/i, '').trim();
		return `<img src="${src}" alt="${safeAlt}" loading="lazy" ${cleaned}>`;
	});

	fs.writeFileSync(filePath, `---\n${frontmatter}\n---\n${body}`, 'utf-8');
}

console.log(`Mise à jour terminée : ${totalPhotos} photographies traitées dans ${files.length} articles.`);