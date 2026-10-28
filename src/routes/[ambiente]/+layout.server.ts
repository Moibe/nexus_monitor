import { error } from '@sveltejs/kit';
import { esAmbiente, definicionDe } from '$lib/ambientes';
import { estaConfigurado, faltantesDe, loQueDiceSer } from '$lib/server/ambientes';
import { destinoDeNexusBack } from '$lib/server/nexusBack';
import type { LayoutServerLoad } from './$types';

// Todo lo que cuelga de aquí sabe en qué ambiente está, y lo sabe por la URL.
//
// Además se le pregunta al back QUÉ AMBIENTE DICE SER. Esa comprobación es el
// punto: nuestra etiqueta la escribimos nosotros y por lo tanto puede mentir
// (un .env mal puesto apunta la pestaña "Dev" a producción). La suya la
// escribe él. Si no coinciden, la pantalla lo grita en vez de dejar que
// alguien retire un superadmin de producción creyendo que juega en dev.
export const load: LayoutServerLoad = async ({ params }) => {
	if (!esAmbiente(params.ambiente)) {
		error(404, `No existe el ambiente "${params.ambiente}".`);
	}

	const ambiente = params.ambiente;
	const definicion = definicionDe(ambiente);

	if (!estaConfigurado(ambiente)) {
		return {
			ambiente,
			definicion,
			destino: null,
			diceSer: null,
			faltantes: faltantesDe(ambiente),
			cruzado: false
		};
	}

	const diceSer = await loQueDiceSer(ambiente);

	return {
		ambiente,
		definicion,
		destino: destinoDeNexusBack(ambiente),
		diceSer,
		faltantes: [] as string[],
		// Solo es cruce si contestó y contestó OTRA cosa. Si no contestó
		// (`null`) no se acusa a nadie: eso es un back caído, no un cruce.
		cruzado: diceSer !== null && diceSer !== definicion.declaraSer
	};
};
