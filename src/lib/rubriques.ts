import type { CollectionEntry } from 'astro:content';
import photos from '../data/photos.json';

export const JOURNEES = 'journees-paul-valery';

export const estJournees = (post: CollectionEntry<'blog'>) =>
	post.data.categories.includes(JOURNEES);

export const parDate = (a: CollectionEntry<'blog'>, b: CollectionEntry<'blog'>) =>
	b.data.pubDate.valueOf() - a.data.pubDate.valueOf();

const dimensions = photos as Record<string, { w: number; h: number }>;
const versVignette = (nom: string) =>
	'/vignettes/' + encodeURIComponent(nom.replace(/\.[^.]+$/, '.webp'));

/** Nom du fichier de la photo qui représente l'article : image à la une de WordPress, sinon la première photo. */
function nomDeCouverture(post: CollectionEntry<'blog'>) {
	const candidats = [post.data.coverImage, post.body?.match(/src="\/images\/([^"]+)"/)?.[1]];
	return candidats.find((n): n is string => !!n && n in dimensions);
}

/** Vignette de couverture (listes, frise de l'accueil). */
export function photoDeCouverture(post: CollectionEntry<'blog'>) {
	const nom = nomDeCouverture(post);
	return nom ? { src: versVignette(nom), ...dimensions[nom] } : null;
}

/** Photo de partage (réseaux sociaux, moteurs de recherche) : la photo d'origine, avec son texte alternatif. */
export function photoDePartage(post: CollectionEntry<'blog'>) {
	const nom = nomDeCouverture(post);
	if (!nom) return undefined;
	const echappe = nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const alt = post.body
		?.match(new RegExp(`src="/images/${echappe}" alt="([^"]*)"`))?.[1]
		?.split(' — ')[0]
		.replace(/&#39;/g, '’')
		.replace(/&quot;/g, '"')
		.replace(/&amp;/g, '&');
	return { src: '/images/' + encodeURIComponent(nom), ...dimensions[nom], alt: alt || post.data.title };
}

/** Description pour les moteurs de recherche : début du premier vrai paragraphe d'introduction. */
export function resume(post: CollectionEntry<'blog'>, max = 158) {
	const paragraphes = (post.body ?? '')
		.split('<!--more-->')[0]
		.split(/\n\s*\n/)
		.map((p) =>
			p
				.replace(/<[^>]+>/g, '')
				.replace(/\*\*|__|(^|\s)_|_(\s|$|[.,;:])/g, '$1$2')
				.replace(/\s+/g, ' ')
				.trim()
		)
		.filter((p) => p.length > 60 && !/^Photographies\s*:|Photos Gilles Hutchinson/i.test(p));
	const texte = paragraphes[0];
	if (!texte) return undefined;
	if (texte.length <= max) return texte;
	const coupe = texte.slice(0, max - 1);
	return coupe.slice(0, coupe.lastIndexOf(' ')).replace(/[\s,;:–—-]+$/, '') + '…';
}
