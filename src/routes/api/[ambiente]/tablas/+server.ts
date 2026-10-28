import { json, error } from '@sveltejs/kit';
import { obtenerTablas } from '$lib/server/nexusBack';
import { ambienteDeParams } from '$lib/server/ambientes';
import { describirError } from '$lib/server/errores';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const ambiente = ambienteDeParams(params.ambiente);
	try {
		const tablas = await obtenerTablas(ambiente);
		return json({ total: tablas.length, tablas });
	} catch (e) {
		console.error('[tablas]', ambiente, e);
		throw error(502, describirError(e));
	}
};
