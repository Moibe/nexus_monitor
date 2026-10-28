import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { esAmbiente, type Ambiente } from '$lib/ambientes';

/** El ambiente que venga en la URL, o 404. Lo usan las rutas de `/api/[ambiente]/...`
 *  para no confiar en un segmento que escribe quien llama. */
export function ambienteDeParams(valor: string | undefined): Ambiente {
	if (!esAmbiente(valor)) error(404, `No existe el ambiente "${valor}".`);
	return valor;
}

// A qué nexus_back le habla cada ambiente, y con qué llave. Cada uno tiene su
// propia base de datos (IA_Nexus_Dev / _Staging / IA_Nexus), así que la llave
// también es distinta: la de un back no abre otro.
//
// SIN FALLBACK a propósito. Es tentador dejar que, si falta la config de un
// ambiente, se use "la de siempre" para que nada se vea roto — pero eso es
// justo el accidente que hay que evitar: una pestaña que dice "Dev" hablando
// con producción sin que nadie se entere. Si falta, falta, y se dice cuál.
const VARIABLES: Record<Ambiente, { url: string; key: string }> = {
	dev: { url: 'NEXUS_DEV_URL', key: 'NEXUS_DEV_KEY' },
	staging: { url: 'NEXUS_STAGING_URL', key: 'NEXUS_STAGING_KEY' },
	prod: { url: 'NEXUS_PROD_URL', key: 'NEXUS_PROD_KEY' }
};

export type ConfigAmbiente = { url: string; key: string };

/** Qué variables le faltan a este ambiente. Vacío = está completo. */
export function faltantesDe(ambiente: Ambiente): string[] {
	const v = VARIABLES[ambiente];
	const faltan: string[] = [];
	if (!env[v.url]) faltan.push(v.url);
	if (!env[v.key]) faltan.push(v.key);
	return faltan;
}

export function estaConfigurado(ambiente: Ambiente): boolean {
	return faltantesDe(ambiente).length === 0;
}

export function configDe(ambiente: Ambiente): ConfigAmbiente {
	const faltan = faltantesDe(ambiente);
	if (faltan.length) {
		throw new Error(`Ambiente ${ambiente} sin configurar: falta ${faltan.join(' y ')} en el .env.`);
	}
	// `faltantesDe` ya garantizó que las dos existen; TypeScript no lo sabe.
	const v = VARIABLES[ambiente];
	return { url: (env[v.url] ?? '').replace(/\/$/, ''), key: env[v.key] ?? '' };
}

/** Qué ambiente dice ser el back al que de verdad estamos hablando.
 *
 *  Se le pregunta a `/health`, que no pide llave. Es la única forma de
 *  detectar una configuración cruzada: nuestra etiqueta la escribimos
 *  nosotros, la suya la escribe él. `null` si no contestó. */
export async function loQueDiceSer(ambiente: Ambiente): Promise<string | null> {
	try {
		const { url } = configDe(ambiente);
		const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5_000) });
		if (!r.ok) return null;
		const cuerpo = await r.json();
		return typeof cuerpo.environment === 'string' ? cuerpo.environment : null;
	} catch {
		return null;
	}
}
