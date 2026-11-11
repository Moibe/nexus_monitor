import { json, error } from '@sveltejs/kit';
import { ErrorNexusBack, panoramaDatos } from '$lib/server/nexusBack';
import { ambienteDeParams } from '$lib/server/ambientes';
import { describirError } from '$lib/server/errores';
import { panoramaPara } from '$lib/server/enmascarar';
import type { RequestHandler } from './$types';

// Los datos extraídos de ese ambiente. En producción salen enmascarados (ver `lib/server/enmascarar.ts`).
export const GET: RequestHandler = async ({ params }) => {
	const ambiente = ambienteDeParams(params.ambiente);
	try {
		return json(panoramaPara(ambiente, await panoramaDatos(ambiente)));
	} catch (e) {
		if (e instanceof ErrorNexusBack && e.status === 404) {
			throw error(502, 'El nexus_back de este ambiente todavía no tiene /monitor-datos: aparecerá cuando se le promueva esa versión.');
		}
		console.error('[datos]', ambiente, e);
		throw error(502, describirError(e));
	}
};
