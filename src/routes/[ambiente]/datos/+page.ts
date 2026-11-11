import type { Panorama } from '$lib/datos';
import type { PageLoad } from './$types';

// Pega contra nuestra propia ruta, que le pregunta a nexus_back. Si falla (back caído, o uno que todavía no tiene `/monitor-datos`),
// la página no se cae: enseña el motivo.
export const load: PageLoad = async ({ fetch, params }) => {
	const r = await fetch(`/api/${params.ambiente}/datos`);
	if (!r.ok) {
		const cuerpo = await r.json().catch(() => null);
		return { error: (cuerpo?.message as string | undefined) ?? `Error ${r.status} al leer los datos.`, panorama: null as Panorama | null };
	}
	return { error: null as string | null, panorama: (await r.json()) as Panorama };
};
