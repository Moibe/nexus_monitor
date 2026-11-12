import type { Ficha } from '$lib/datos';
import type { PageLoad } from './$types';

// La ficha de un documento, en su propia página. Pega contra nuestra ruta, que le pregunta a nexus_back y enmascara en producción.
export const load: PageLoad = async ({ fetch, params }) => {
	const r = await fetch(`/api/${params.ambiente}/datos/${params.documento}`);
	if (!r.ok) {
		const cuerpo = await r.json().catch(() => null);
		return { error: (cuerpo?.message as string | undefined) ?? `Error ${r.status} al abrir el documento.`, ficha: null as Ficha | null };
	}
	return { error: null as string | null, ficha: (await r.json()) as Ficha };
};
