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

/** Photo qui représente l'article : image à la une de WordPress, sinon la première photo. */
export function photoDeCouverture(post: CollectionEntry<'blog'>) {
	const candidats = [post.data.coverImage, post.body?.match(/src="\/images\/([^"]+)"/)?.[1]];
	const nom = candidats.find((n): n is string => !!n && n in dimensions);
	return nom ? { src: versVignette(nom), ...dimensions[nom] } : null;
}
