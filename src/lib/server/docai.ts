import { GoogleAuth } from 'google-auth-library';
import { env } from '$env/dynamic/private';
import type { Procesador } from '$lib/procesadores';

export type { Procesador };

// Sin default para el proyecto, a propósito: un id quemado en el código es
// justo lo que no puede vivir en un repo público, y un default silencioso
// haría que la app apunte al proyecto equivocado sin que nadie se entere.
const PROJECT = env.DOCAI_PROJECT_ID;
const LOCATION = env.DOCAI_LOCATION ?? 'us';

// Una sola instancia por proceso, NO una por request: GoogleAuth cachea el
// token y lo refresca solo cuando expira (~3600 s medidos). Crearla dentro del
// handler agrega un viaje a oauth2.googleapis.com por cada carga de la lista.
//
// El scope tiene que ser `cloud-platform` COMPLETO. Se probó
// `cloud-platform.read-only`, que parece la elección obvia para una app que
// solo lista, y Document AI responde 403 "Request had insufficient
// authentication scopes". No hay scope de solo lectura que sirva aquí: el
// token que usa Monitor PUEDE escribir, y que no escriba es disciplina del
// código, no del permiso.
const auth = new GoogleAuth({
	scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

export async function listarProcesadores(): Promise<Procesador[]> {
	// La comprobación va AQUÍ y no arriba, a nivel de módulo. Probado: un
	// `throw` en el cuerpo del módulo REVIENTA EL BUILD, porque SvelteKit lo
	// importa al compilar y `$env/dynamic/private` todavía está vacío en ese
	// momento (`npm run build` sale con exit 1 y el mensaje de este error).
	// Dentro de la función falla al primer request, que es donde se entiende.
	if (!PROJECT) throw new Error('Falta DOCAI_PROJECT_ID: cópialo del .env de nexus_back.');

	const token = await auth.getAccessToken();
	const base = `https://${LOCATION}-documentai.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/processors`;

	const todos: Procesador[] = [];
	let pageToken = '';

	// Hoy los 45 caben en UNA página con pageSize=100: la respuesta real ni
	// siquiera trae `nextPageToken`. El bucle se queda porque el mecanismo sí
	// existe — medido con pageSize=20, la API devuelve 3 páginas con token real
	// — y el día que pasen de 100 nadie se va a acordar de agregarlo.
	//
	// `processors.list` NO acepta `filter` ni `orderBy`: cualquiera de los dos
	// responde HTTP 400 "Cannot bind query parameter". Todo el orden, el
	// filtrado y la búsqueda se hacen de este lado, sobre el arreglo completo.
	do {
		const url = new URL(base);
		url.searchParams.set('pageSize', '100');
		if (pageToken) url.searchParams.set('pageToken', pageToken);

		// `fetch` no trae timeout por default: sin esto, una petición colgada
		// cuelga la carga de la lista para siempre.
		const r = await fetch(url, {
			headers: { Authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(30_000)
		});
		if (!r.ok) {
			throw new Error(`Document AI ${r.status}: ${(await r.text()).slice(0, 300)}`);
		}
		const pagina = await r.json();
		todos.push(...(pagina.processors ?? []));
		pageToken = pagina.nextPageToken ?? '';
	} while (pageToken);

	return todos;
}
