import { json, error } from '@sveltejs/kit';
import { ErrorNexusBack, fichaDatos } from '$lib/server/nexusBack';
import { ambienteDeParams } from '$lib/server/ambientes';
import { describirError } from '$lib/server/errores';
import { fichaPara } from '$lib/server/enmascarar';
import type { RequestHandler } from './$types';

const ID_VALIDO = /^documento-[0-9a-f]{32}$/;

// La ficha de un documento. En producción sus valores salen enmascarados (ver `lib/server/enmascarar.ts`).
export const GET: RequestHandler = async ({ params }) => {
	const ambiente = ambienteDeParams(params.ambiente);
	if (!ID_VALIDO.test(params.id)) throw error(400, 'Ese no es un id de documento.');
	try {
		return json(fichaPara(ambiente, await fichaDatos(ambiente, params.id)));
	} catch (e) {
		if (e instanceof ErrorNexusBack && e.status === 404) throw error(404, 'Ese documento ya no está en este ambiente.');
		console.error('[datos/ficha]', ambiente, params.id, e);
		throw error(502, describirError(e));
	}
};
