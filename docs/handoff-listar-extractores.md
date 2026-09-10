# Handoff: listar los extractores de Document AI en Nexus Monitor

Para quien construya la primera pantalla de Nexus Monitor. Alcance de este documento:
**traer los procesadores de Document AI y desplegarlos en una lista.** Nada más. Ni
métricas de uso, ni borrar, ni deshabilitar.

## Contexto

NexusDoc crea procesadores de Google Document AI por su cuenta: uno por cada tipo
documental que se activa desde la Biblioteca, más un clasificador compartido. Nadie los
da de baja, así que se acumulan. Hoy hay **45 vivos** y no existe ninguna pantalla que
los muestre. Eso es lo que viene a resolver esta primera vista.

El estilo no importa aquí. El chrome (barra superior, lateral plegable, tarjeta de
vidrio) ya está en el repo y la lista va dentro. Este documento es solo la funcionalidad.

## Estado que se cree tener (verificar, no asumir)

Todo lo de abajo se midió el **2026-09-10** desde la laptop de desarrollo, contra el
proyecto real. Puede haber cambiado.

| Dato | Valor |
|---|---|
| Proyecto y location | los del `.env` de `nexus_back`: `DOCAI_PROJECT_ID` y `DOCAI_LOCATION` |
| Location en uso | `us` (se barrieron las 10 y las otras 9 devuelven cero) |
| Procesadores | 45, todos en state `ENABLED` |
| Desglose | 44 `CUSTOM_EXTRACTION_PROCESSOR` + 1 `CUSTOM_CLASSIFICATION_PROCESSOR` |
| Credencial | service account, ruta en `GOOGLE_APPLICATION_CREDENTIALS` |

**Este repo es PÚBLICO**, igual que `nexus_back`. Por eso aquí no van el número de
proyecto ni el id del clasificador ni ninguna ruta real: se copian del `.env` de
`nexus_back`, que vive fuera de git. Misma regla que su `.env.example`, donde
`DOCAI_PROJECT_ID=` está vacío a propósito.

**Dato no obvio:** la service account **no pertenece al proyecto de Document AI**;
consulta cross-project y funciona porque alguien le dio el rol. Además, **crear llaves
nuevas está bloqueado** (verificado 2026-08-17, `gcloud iam service-accounts keys create`
responde `PERMISSION_DENIED`). Si necesitas credencial, reusa la que ya existe en el
`.env` de `nexus_back`; no intentes generar otra.

El repo **no tiene ni un commit**. Todo va a salir como untracked en `git status` y eso
es normal, no un cambio que alguien haya metido.

## Tarea 1 — Preparar el repo

```bash
npm i google-auth-library
npm i -D @sveltejs/adapter-node
```

**El adapter se cambia en `vite.config.ts`, no en `svelte.config.js`.** Ese archivo no
existe en este scaffold; la configuración vive dentro de `sveltekit({...})`. Cambia la
línea 1:

```diff
-import adapter from '@sveltejs/adapter-auto';
+import adapter from '@sveltejs/adapter-node';
```

`adapter-auto` no sirve para esto: la ruta necesita un proceso Node de verdad con acceso
al sistema de archivos para leer el JSON de la service account. En un destino serverless
ese archivo no existe.

**Criterio de éxito:** `npm run build` imprime `Using @sveltejs/adapter-node`.

## Tarea 2 — El módulo que habla con Google

`src/lib/server/docai.ts`. Va en `lib/server/` a propósito: SvelteKit prohíbe importar
esa carpeta desde código de cliente, así que es imposible filtrar el token al navegador
por accidente.

```ts
import { GoogleAuth } from 'google-auth-library';
import { env } from '$env/dynamic/private';

// Sin default para el proyecto, a propósito: un id quemado en el código es
// justo lo que no puede vivir en un repo público, y un default silencioso
// haría que la app apunte al proyecto equivocado sin que nadie se entere.
const PROJECT = env.DOCAI_PROJECT_ID;
const LOCATION = env.DOCAI_LOCATION ?? 'us';

export type Procesador = {
	name: string;
	type: string;
	displayName: string;
	state: string;
	processEndpoint: string;
	createTime: string;
	defaultProcessorVersion: string;
	processorVersionAliases?: { alias: string; processorVersion: string }[];
};

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
```

**Por qué `google-auth-library` y no `@google-cloud/documentai`.** Medido en disco:
11.26 MB contra 32.33 MB, y el cliente oficial arrastra gRPC, protobufjs, google-gax y
OpenTelemetry. Además devuelve `createTime` como Timestamp de protobuf
(`{seconds, nanos}`) en vez de string ISO, o sea conversión manual en cada fila de la
lista. Solo gana en líneas de código, unas siete, porque pagina solo. Es la misma
decisión que ya tomó `nexus_back` del lado de Python y por el mismo motivo, documentada
en `servicios/ia.py:7-9`.

**`$env/dynamic/private`, nunca `$env/static/private`.** Con el estático el build
**muere** con `[MISSING_EXPORT] "DOCAI_PROJECT_ID" is not exported`, y ponerle un
`?? 'default'` no salva porque revienta en el import, no en el uso.

## Tarea 3 — La ruta

`src/routes/api/procesadores/+server.ts`:

```ts
import { json, error } from '@sveltejs/kit';
import { listarProcesadores } from '$lib/server/docai';
import { describirError } from '$lib/server/errores';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const procesadores = await listarProcesadores();
		return json({ total: procesadores.length, procesadores });
	} catch (e) {
		// El detalle completo al log del server; al navegador solo la versión
		// domesticada. El mensaje crudo de google-auth incluye la RUTA ABSOLUTA
		// del archivo de credenciales, y eso no tiene por qué viajar al cliente.
		console.error('[procesadores]', e);
		throw error(502, describirError(e));
	}
};
```

**Los helpers van en otro archivo.** Un `+server.ts` solo puede exportar `GET`, `POST`,
`PATCH`, `PUT`, `DELETE`, `OPTIONS`, `HEAD` y `fallback`. Exportar cualquier otra cosa
rompe el build con `Invalid export`. Por eso `describirError` vive en
`src/lib/server/errores.ts`:

```ts
/**
 * Traduce la excepción a algo que se pueda enseñar. Con `fetch` nativo, un
 * fallo de red da `TypeError: fetch failed` y punto: la causa real (ENOTFOUND,
 * ERR_TLS_CERT_ALTNAME_INVALID) solo vive en `e.cause.code`.
 */
export function describirError(e: unknown): string {
	if (e instanceof DOMException && e.name === 'TimeoutError')
		return 'Document AI no respondió en 30 s.';
	if (e instanceof TypeError && e.message === 'fetch failed') {
		const causa = (e as { cause?: { code?: string } }).cause;
		return `No se pudo alcanzar Document AI (${causa?.code ?? 'red'}).`;
	}
	// Dos redacciones distintas para dos fallas distintas, y las dos son las
	// más probables en producción. Si solo atrapas la primera, la segunda
	// —que es la típica ruta mal escrita en el arranque de pm2— cae al
	// mensaje genérico y no diagnostica nada. Medido con las dos.
	if (e instanceof Error && e.message.includes('Could not load the default credentials'))
		return 'Falta GOOGLE_APPLICATION_CREDENTIALS en el server.';
	if (e instanceof Error && e.message.includes('Unable to read the credential file'))
		return 'GOOGLE_APPLICATION_CREDENTIALS apunta a un archivo que no se puede leer.';
	if (e instanceof Error && e.message.startsWith('Falta DOCAI_PROJECT_ID'))
		return e.message;
	if (e instanceof Error && e.message.startsWith('Document AI 403'))
		return 'La credencial no tiene permiso sobre este proyecto de Document AI.';
	if (e instanceof Error && e.message.startsWith('Document AI 4'))
		return 'Document AI rechazó la petición. Revisa el proyecto y la location.';
	return 'No se pudo obtener la lista de procesadores.';
}
```

**Criterio de éxito:** con el server corriendo,
`curl http://127.0.0.1:3435/api/procesadores` devuelve `200` y un JSON cuyo `total` es
`45`.

## Tarea 4 — Descomponer el nombre

Sin esto la lista son 45 renglones planos con nombres que se repiten. El `displayName`
lo compone `nexus_back` (`servicios/procesadores.py:114` y `:129`) y **codifica de qué
tipo documental es y qué versión**, así que no hace falta ninguna otra fuente para
agrupar.

Cuatro formas vivas:

| Forma | Ejemplo | Cuántos |
|---|---|---|
| Actual | `nexusdoc--tipo-mtknlogx-1--v2--pasaporte` | 37 |
| Vieja, sin versión | `nexusdoc--tipo-mtknlogx-1--pasaporte` | 2 |
| Clasificador | `nexusdoc-clasificador` | 1 |
| Legado, hecho a mano en la consola | `ine`, `sat_csf`, `cedula` | 5 |

```ts
export type Origen = 'nexusdoc' | 'nexusdoc-sinversion' | 'clasificador' | 'legado';

export function parsearDisplayName(displayName: string | undefined) {
	const dn = displayName ?? '';
	// El clasificador PRIMERO: usa UN solo guion, así que sin este caso
	// especial caería en 'legado'.
	if (dn === 'nexusdoc-clasificador')
		return { origen: 'clasificador' as Origen, tipoId: null, version: null, slug: null };
	if (!dn.startsWith('nexusdoc--'))
		return { origen: 'legado' as Origen, tipoId: null, version: null, slug: null };

	const partes = dn.split('--');
	const tipoId = partes[1] ?? '';
	// Contra el SEGMENTO COMPLETO, no como prefijo: 'v10'.startsWith('v1') es
	// true, y esa comparación ingenua ya mordió a este proyecto del lado de
	// Python (ver el comentario en procesadores.py:202-206).
	const m = /^v(\d+)$/.exec(partes[2] ?? '');
	const version = m ? Number(m[1]) : null;
	const slug = partes.slice(m ? 3 : 2).join('--');
	return {
		origen: (version === null ? 'nexusdoc-sinversion' : 'nexusdoc') as Origen,
		tipoId,
		version,
		slug
	};
}
```

**El separador es doble a propósito.** El id del tipo trae dos guiones simples adentro
(`tipo-mtknlogx-1`) y varios slugs traen uno (`comprobante-domicilio`, `cedula-panamena`,
`fgv-g`). Un `split('-')` destroza el nombre; solo `split('--')`.

Agrupa por `tipoId` y ordena dentro de cada grupo por versión descendente. Tres detalles
medidos que hay que respetar:

- **El encabezado del grupo no puede ser solo el slug.** Seis tipos documentales
  distintos se llaman `ine` y cuatro se llaman `pasaporte`. El título tiene que llevar el
  `tipoId` al lado o la lista miente.
- **El slug deriva entre versiones del mismo tipo**, porque el usuario renombra el tipo y
  Document AI no deja renombrar un procesador ya creado. `tipo-mtm3pljh-1` va de `ine3` a
  `ine4` a `ine5`. Toma el título del slug de la versión más alta.
- **Ordena por versión, no por fecha.** Tres tipos tienen dos versiones creadas en el
  mismo minuto, y como la fecha se muestra a minutos quedarían en orden arbitrario.

El id corto para mostrar sale de `name.split('/').at(-1)`. **Nunca por longitud fija:**
43 ids tienen 16 caracteres y 2 tienen 15, porque es hexadecimal sin ceros a la
izquierda.

`createTime` llega en ISO-8601 UTC con seis decimales
(`"2026-09-08T16:16:15.342262Z"`). Fórmatalo a la hora local de quien mira, con el mismo
criterio que ya usa NexusDoc en `DetalleDocumentoSheet.svelte`.

## Qué NO hacer

- **No prometas una columna de "último uso".** No existe. Se revisaron los dos documentos
  de descubrimiento completos de v1 y v1beta3 buscando `last|usage|invocation`: cero
  resultados. Los ocho campos que llegan son los del tipo `Procesador` de arriba y nada
  más. Saber quién se usó sale de Cloud Monitoring, que es otro trabajo y no éste.
- **No escondas ni filtres por default los 5 legados sin prefijo.** Uno de ellos, `ine`,
  es el procesador **más usado de todo el proyecto**, con casi 500 documentos. Una lista
  que los oculta por "no ser de NexusDoc" esconde justo lo que más importa.
- **No pintes los huecos de versión como error.** `tipo-mtaqjzt9-1` empieza en la v2 y
  `tipo-mtn3e50k-1` va 1, 2, 4. Son borrados reales, no datos corruptos. No calcules el
  total de versiones como `max(version)`.
- **Nada de borrar, deshabilitar ni republicar en esta pantalla.** Es irreversible y se
  lleva el dataset y el esquema. Esta primera versión lee y ya.
- **No uses `navigator.clipboard` para un botón de copiar el id.** Una lista de 45 ids
  largos lo pide a gritos, y es API de contexto seguro: el server de CSI sirve por HTTP
  plano, así que ahí no existe. Mismo veto para `crypto.randomUUID` y `crypto.subtle`.
- **No pongas el `.env` como único mecanismo de configuración y lo des por bueno.** Ver
  la trampa de abajo.

## La trampa de las credenciales

Es la que más se disfraza de otra cosa, así que léela dos veces.

**En la laptop, la app funciona sin configurar nada.** Si falta
`GOOGLE_APPLICATION_CREDENTIALS`, `google-auth-library` cae en silencio a las
credenciales de `gcloud` que ya están instaladas y devuelve los 45 igual. Pero es **otra
identidad** (`type: authorized_user`, la cuenta personal), no la service account. En el
server, donde no hay `gcloud`, truena con `Could not load the default credentials`.

**Y `node build/index.js` no lee el `.env`.** Se comprobó con un discriminador: un `.env`
con un id de proyecto falso fue ignorado por completo y la ruta respondió con el proyecto
real. En desarrollo Vite sí carga el `.env`; en producción las variables tienen que venir
del entorno del proceso, o sea del `ecosystem.config.js` de pm2 o del shell que lo lanza.

La consecuencia práctica: **prueba el arranque limpio antes de dar la configuración por
buena.** Un `npm run dev` verde no prueba absolutamente nada sobre producción.

## Qué reportar de vuelta

1. Si `curl /api/procesadores` devolvió 45, y cuánto tardó.
2. Cuántos grupos salieron al agrupar por tipo. Deberían ser 19 tipos, más el
   clasificador, más la bolsa de legados.
3. Cualquier `displayName` que el parser haya clasificado como `legado` sin serlo. Es la
   señal de que apareció una forma de nombre que este documento no contempla.
4. Si el arranque limpio en el server funcionó con la service account, o si cayó a otra
   identidad.

## Qué se verificó de este documento

Los cuatro bloques de código se extrajeron de este archivo, se escribieron en sus rutas
sobre una copia limpia de este repo, y se ejecutaron. No están transcritos de memoria:

- `npm run check` — 217 archivos, 0 errores, 0 warnings.
- `npm run build` — genera `build/index.js` con adapter-node, **sin** variables de
  entorno definidas. Es la prueba que importa: una versión anterior de este documento
  ponía la comprobación de `DOCAI_PROJECT_ID` a nivel de módulo y **rompía el build**.
- `curl /api/procesadores` contra el proyecto real — HTTP 200, `total: 45`.
- Credencial con ruta inexistente — HTTP 502 y el mensaje domesticado, sin filtrar la
  ruta del archivo al navegador.
- Sin `DOCAI_PROJECT_ID` — HTTP 502 diciendo exactamente qué falta.
- **Sin `GOOGLE_APPLICATION_CREDENTIALS` — HTTP 200 con los 45.** O sea la trampa de
  arriba es real y está reproducida: en esta laptop la app funciona sin credencial
  configurada, usando otra identidad.
- El parser, contra los 45 nombres reales: clasifica 37 + 2 + 1 + 5, reconstruye los 45
  nombres exactos sin pérdida, encuentra los 19 tipos, y confirma que hay slugs
  repetidos, ids de dos anchos distintos y un hueco de versión.

Cuando esta lista exista, el siguiente paso natural es cruzarla con Cloud Monitoring para
saber cuáles se han usado de verdad. De los 45, solo 8 han procesado un documento alguna
vez. Pero eso es otro handoff.
