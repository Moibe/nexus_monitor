import { consultaDe, filtrarDocumentos, filtrosDeUrl, type Ficha, type Panorama } from '$lib/datos';
import type { PageLoad } from './$types';

// La ficha de un documento, en su propia página. Pega contra nuestras rutas, que le preguntan a nexus_back y enmascaran en producción.
// Pide también la lista para saber el documento anterior y el siguiente, con los MISMOS filtros que traía la lista (viajan en la
// dirección): las flechas recorren lo que se estaba viendo.
export const load: PageLoad = async ({ fetch, params, url }) => {
	const [rFicha, rLista] = await Promise.all([
		fetch(`/api/${params.ambiente}/datos/${params.documento}`),
		fetch(`/api/${params.ambiente}/datos`)
	]);

	const filtros = filtrosDeUrl(url.searchParams);
	const consulta = consultaDe(filtros);
	let vecinos = { anterior: null as string | null, siguiente: null as string | null, posicion: 0, total: 0 };
	if (rLista.ok) {
		const lista = filtrarDocumentos(((await rLista.json()) as Panorama).documentos, filtros);
		const i = lista.findIndex((d) => d.id === params.documento);
		if (i >= 0) {
			vecinos = {
				anterior: i > 0 ? lista[i - 1].id : null,
				siguiente: i < lista.length - 1 ? lista[i + 1].id : null,
				posicion: i + 1,
				total: lista.length
			};
		}
	}

	if (!rFicha.ok) {
		const cuerpo = await rFicha.json().catch(() => null);
		return {
			error: (cuerpo?.message as string | undefined) ?? `Error ${rFicha.status} al abrir el documento.`,
			ficha: null as Ficha | null,
			consulta,
			...vecinos
		};
	}
	return { error: null as string | null, ficha: (await rFicha.json()) as Ficha, consulta, ...vecinos };
};
