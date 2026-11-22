import type { CollectionEntry } from 'astro:content';

export const JOURNEES = 'journees-paul-valery';

export const estJournees = (post: CollectionEntry<'blog'>) =>
	post.data.categories.includes(JOURNEES);

export const parDate = (a: CollectionEntry<'blog'>, b: CollectionEntry<'blog'>) =>
	b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
