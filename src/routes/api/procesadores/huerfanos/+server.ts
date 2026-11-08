import { json, error } from '@sveltejs/kit';
import { AmbienteSinRespuesta, repartirProcesadores } from '$lib/server/huerfanos';
import { eliminarProcesador } from '$lib/server/docai';
import { describirError } from '$lib/server/errores';
import type { RequestHandler } from './$types';

// Document AI es uno para todos los ambientes, así que esta ruta tampoco cuelga de uno: le pregunta a los tres.

export const GET: RequestHandler = async () => {
	try {
		return json(await repartirProcesadores());
	} catch (e) {
		if (e instanceof AmbienteSinRespuesta) throw error(503, e.message);
		console.error('[procesadores/huerfanos]', e);
		throw error(502, describirError(e));
	}
};

const ID_VALIDO = /^[a-z0-9]+$/i;

/**
 * Borra los ids pedidos, pero SOLO los que siguen siendo huérfanos al momento de borrar: el reparto se vuelve a
 * calcular aquí y no se confía en la lista del navegador, que pudo quedar vieja (alguien activó un tipo entre que
 * se vio la lista y se apretó el botón). Lo que dejó de ser huérfano se reporta como `omitido`.
 */
export const POST: RequestHandler = async ({ request }) => {
	const cuerpo = await request.json().catch(() => null);
	const ids: unknown = cuerpo?.ids;
	if (!Array.isArray(ids) || ids.length === 0 || !ids.every((i) => typeof i === 'string' && ID_VALIDO.test(i))) {
		throw error(400, 'Manda una lista de ids de procesador válidos.');
	}

	let huerfanos: Set<string>;
	try {
		huerfanos = new Set((await repartirProcesadores()).huerfanos.map((p) => p.id));
	} catch (e) {
		if (e instanceof AmbienteSinRespuesta) throw error(503, e.message);
		console.error('[procesadores/huerfanos/borrar]', e);
		throw error(502, describirError(e));
	}

	const resultados: { id: string; resultado: 'borrado' | 'omitido' | 'fallo'; detalle?: string }[] = [];
	// Uno por uno y no en paralelo: son pocos, y así un error de cuota no se lleva a todos de golpe.
	for (const id of new Set(ids as string[])) {
		if (!huerfanos.has(id)) {
			resultados.push({ id, resultado: 'omitido', detalle: 'Ya no es huérfano (o ya no existe): no se tocó.' });
			continue;
		}
		try {
			await eliminarProcesador(id);
			resultados.push({ id, resultado: 'borrado' });
		} catch (e) {
			console.error('[procesadores/huerfanos/borrar]', id, e);
			resultados.push({ id, resultado: 'fallo', detalle: describirError(e) });
		}
	}
	return json({ resultados });
};
