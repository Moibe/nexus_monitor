import { json, error } from '@sveltejs/kit';
import { listarProcesadores } from '$lib/server/docai';
import { describirError } from '$lib/server/errores';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const procesadores = await listarProcesadores();
		return json({ total: procesadores.length, procesadores });
	} catch (e) {
		// El detalle completo al log del server; al navegador solo la versión
		// domesticada. El mensaje crudo de google-auth incluye la RUTA ABSOLUTA
		// del archivo de credenciales, y eso no tiene por qué viajar al cliente.
		console.error('[procesadores]', e);
		throw error(502, describirError(e));
	}
};
