import { diasDe, type PanoramaBusqueda } from '$lib/busqueda';
import type { PageLoad } from './$types';

// Pega contra nuestra propia ruta, que le pregunta a nexus_back. Si falla (back caído, o uno que todavía no tiene `/monitor-busqueda`), la página
// no se cae: enseña el motivo. El periodo va en la dirección (`?dias=7|30|90`).
export const load: PageLoad = async ({ fetch, params, url }) => {
	const dias = diasDe(url.searchParams.get('dias'));
	const r = await fetch(`/api/${params.ambiente}/busqueda?dias=${dias}`);
	if (!r.ok) {
		const cuerpo = await r.json().catch(() => null);
		return { dias, error: (cuerpo?.message as string | undefined) ?? `Error ${r.status} al leer la búsqueda.`, panorama: null as PanoramaBusqueda | null };
	}
	return { dias, error: null as string | null, panorama: (await r.json()) as PanoramaBusqueda };
};
