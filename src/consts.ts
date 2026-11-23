// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Photos Musée Paul Valéry';
export const SITE_DESCRIPTION =
	'Reportages photographiques de Gilles Hutchinson au Musée Paul Valéry de Sète : expositions, vernissages, accrochages et Journées Paul Valéry.';

/** Photo de partage par défaut (accueil, listes) : une salle de l'exposition Martial Raysse */
export const SITE_IMAGE = {
	src: '/images/ant_8032-panorama-2-70.jpg',
	w: 1240,
	h: 774,
	alt: 'Salle de l’exposition Martial Raysse au Musée Paul Valéry, Sète',
};

export const AUTEUR = { '@type': 'Person', name: 'Gilles Hutchinson', url: 'https://gilleshutchinson.com/' };

/** Le lieu de tous les reportages, pour les données structurées */
export const MUSEE = {
	'@type': 'Museum',
	name: 'Musée Paul Valéry',
	address: { '@type': 'PostalAddress', addressLocality: 'Sète', addressCountry: 'FR' },
};
