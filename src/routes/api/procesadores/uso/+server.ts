import { json, error } from '@sveltejs/kit';
import { obtenerUsoProcesadores, VENTANA_DIAS } from '$lib/server/monitoring';
import { describirError } from '$lib/server/errores';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const uso = await obtenerUsoProcesadores();
		return json({ ventanaDias: VENTANA_DIAS, uso: Object.fromEntries(uso) });
	} catch (e) {
		console.error('[procesadores/uso]', e);
		throw error(502, describirError(e));
	}
};
