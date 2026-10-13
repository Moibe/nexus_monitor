import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// La raíz no tiene contenido propio: hoy la única sección es Procesadores, así
// que manda ahí en vez de dejar una home vacía. Cuando haya más secciones, este
// es el lugar donde se decide cuál es la de entrada.
export const load: PageLoad = () => {
	redirect(307, '/procesadores');
};
