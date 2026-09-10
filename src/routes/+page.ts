import { agruparProcesadores } from '$lib/procesadores';
import type { PageLoad } from './$types';

export type UsoPorProcesador = Record<string, { ok: number; error: number }>;

// Universal load: pega contra nuestras propias rutas `/api/procesadores` y
// `/api/procesadores/uso` en vez de leer los módulos de server directo, para
// que ambas queden como superficie real y probable con `curl`.
export const load: PageLoad = async ({ fetch }) => {
	const [rLista, rUso] = await Promise.all([
		fetch('/api/procesadores'),
		fetch('/api/procesadores/uso')
	]);

	if (!rLista.ok) {
		const cuerpo = await rLista.json().catch(() => null);
		return {
			error:
				(cuerpo?.message as string | undefined) ?? `Error ${rLista.status} al cargar los procesadores.`,
			total: 0,
			grupos: [],
			uso: null as UsoPorProcesador | null,
			usoError: null as string | null,
			ventanaDias: null as number | null
		};
	}

	const { total, procesadores } = await rLista.json();

	// El cruce con Cloud Monitoring es un plus, no un requisito del listado:
	// si falla (permiso, timeout, lo que sea) la lista se sigue mostrando
	// igual, solo sin las banderas de uso.
	let uso: UsoPorProcesador | null = null;
	let usoError: string | null = null;
	let ventanaDias: number | null = null;
	if (rUso.ok) {
		const cuerpoUso = await rUso.json();
		uso = cuerpoUso.uso;
		ventanaDias = cuerpoUso.ventanaDias;
	} else {
		const cuerpo = await rUso.json().catch(() => null);
		usoError = (cuerpo?.message as string | undefined) ?? `Error ${rUso.status} al cargar el uso.`;
	}

	return {
		error: null as string | null,
		total,
		grupos: agruparProcesadores(procesadores),
		uso,
		usoError,
		ventanaDias
	};
};
