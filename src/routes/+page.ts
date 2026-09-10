import { agruparProcesadores } from '$lib/procesadores';
import type { PageLoad } from './$types';

// Universal load: pega contra nuestra propia ruta `/api/procesadores` en vez
// de llamar `listarProcesadores()` directo, para que la API quede como
// superficie real y probable con `curl` (ver el handoff), no solo un detalle
// interno de esta página.
export const load: PageLoad = async ({ fetch }) => {
	const r = await fetch('/api/procesadores');

	if (!r.ok) {
		const cuerpo = await r.json().catch(() => null);
		return {
			error: (cuerpo?.message as string | undefined) ?? `Error ${r.status} al cargar los procesadores.`,
			total: 0,
			grupos: []
		};
	}

	const { total, procesadores } = await r.json();
	return { error: null, total, grupos: agruparProcesadores(procesadores) };
};
