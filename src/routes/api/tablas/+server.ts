import { json, error } from '@sveltejs/kit';
import { obtenerTablas } from '$lib/server/nexusBack';
import { describirError } from '$lib/server/errores';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const tablas = await obtenerTablas();
		return json({ total: tablas.length, tablas });
	} catch (e) {
		console.error('[tablas]', e);
		throw error(502, describirError(e));
	}
};
