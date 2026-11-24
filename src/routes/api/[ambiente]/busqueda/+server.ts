import { json, error } from '@sveltejs/kit';
import { ErrorNexusBack, panoramaBusqueda } from '$lib/server/nexusBack';
import { ambienteDeParams } from '$lib/server/ambientes';
import { diasDe } from '$lib/busqueda';
import type { RequestHandler } from './$types';

// Las preguntas de la búsqueda por organización en ese ambiente (NEX-609). Solo números: no hay nada que enmascarar en producción.
export const GET: RequestHandler = async ({ params, url }) => {
	const ambiente = ambienteDeParams(params.ambiente);
	try {
		return json(await panoramaBusqueda(ambiente, diasDe(url.searchParams.get('dias'))));
	} catch (e) {
		if (e instanceof ErrorNexusBack && e.status === 404) {
			throw error(502, 'El nexus_back de este ambiente todavía no tiene /monitor-busqueda: aparecerá cuando se le promueva esa versión.');
		}
		if (e instanceof ErrorNexusBack && e.status === 401) {
			throw error(502, 'nexus_back rechazó la llave de ese ambiente: no coincide con la suya.');
		}
		console.error('[busqueda]', ambiente, e);
		throw error(502, e instanceof ErrorNexusBack ? `nexus_back respondió ${e.status}.` : 'No se pudo alcanzar nexus_back.');
	}
};
