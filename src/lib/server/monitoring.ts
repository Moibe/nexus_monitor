import { GoogleAuth } from 'google-auth-library';
import { env } from '$env/dynamic/private';

// Mismo proyecto y misma razón que en docai.ts: sin default quemado, y el
// scope tiene que ser cloud-platform completo (Monitoring no tiene un scope
// de solo-lectura más angosto que le sirva a esta service account cross-project).
const PROJECT = env.DOCAI_PROJECT_ID;

// Instancia única por proceso: cachea y refresca el token sola.
const auth = new GoogleAuth({
	scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

export type UsoProcesador = { ok: number; error: number };

// 728 días (17472 h) es el MÁXIMO que acepta `aggregation.alignmentPeriod` en
// la API de Cloud Monitoring — probado contra la API real: 800 días responde
// 400 INVALID_ARGUMENT con ese límite exacto en el mensaje del error. No es
// "toda la vida del proyecto", es el techo que Monitoring permite consultar
// de una sola vez. Como los procesadores de Document AI aquí llevan solo unos
// meses vivos, hoy la ventana cubre su historia completa igual — pero el día
// que alguno cumpla más de ~24 meses, un "nunca usado" con esta ventana deja
// de significar "nunca" y pasa a significar "no en los últimos 24 meses".
export const VENTANA_DIAS = 728;

// Es por processor_VERSION, no por processor: un mismo procesador puede tener
// varias versiones (ver defaultProcessorVersion / processorVersionAliases en
// docai.ts), así que se agrupa por resource.label.processor_id para sumar
// todas las versiones de un procesador en un solo número.
const METRIC = 'documentai.googleapis.com/processor_version/processed_document_count';

/**
 * Cruza contra Cloud Monitoring cuántos documentos ha procesado cada
 * processor_id en la ventana de arriba, separando el status OK del resto.
 * Solo OK cuenta como "documento realmente procesado": CLIENT_ERROR y
 * similares son intentos que no llegaron a producir un documento — medido
 * contra el proyecto real, el procesador legado `ine` tiene OK muy por
 * encima de cualquier otro, y al menos uno de los 45 solo tiene
 * CLIENT_ERROR sin un solo OK (fue invocado, nunca proceso nada de verdad).
 */
export async function obtenerUsoProcesadores(): Promise<Map<string, UsoProcesador>> {
	if (!PROJECT) throw new Error('Falta DOCAI_PROJECT_ID: cópialo del .env de nexus_back.');

	const token = await auth.getAccessToken();
	const ahora = new Date();
	const inicio = new Date(ahora.getTime() - VENTANA_DIAS * 24 * 60 * 60 * 1000);

	const url = new URL(`https://monitoring.googleapis.com/v3/projects/${PROJECT}/timeSeries`);
	url.searchParams.set('filter', `metric.type = "${METRIC}"`);
	url.searchParams.set('interval.startTime', inicio.toISOString());
	url.searchParams.set('interval.endTime', ahora.toISOString());
	// Un solo bucket que cubre toda la ventana: no necesitamos serie de
	// tiempo, solo el total acumulado por procesador.
	url.searchParams.set('aggregation.alignmentPeriod', `${VENTANA_DIAS * 24 * 60 * 60}s`);
	url.searchParams.set('aggregation.perSeriesAligner', 'ALIGN_SUM');
	url.searchParams.set('aggregation.crossSeriesReducer', 'REDUCE_SUM');
	url.searchParams.append('aggregation.groupByFields', 'resource.label.processor_id');
	url.searchParams.append('aggregation.groupByFields', 'metric.label.status');

	const r = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
		signal: AbortSignal.timeout(30_000)
	});
	if (!r.ok) {
		throw new Error(`Cloud Monitoring ${r.status}: ${(await r.text()).slice(0, 300)}`);
	}

	const body = await r.json();
	const porProcesador = new Map<string, UsoProcesador>();

	for (const ts of body.timeSeries ?? []) {
		const pid = ts.resource?.labels?.processor_id;
		if (!pid) continue;
		const total = (ts.points ?? []).reduce(
			(s: number, p: { value?: { int64Value?: string } }) => s + Number(p.value?.int64Value ?? 0),
			0
		);
		const status = ts.metric?.labels?.status;
		const entry = porProcesador.get(pid) ?? { ok: 0, error: 0 };
		if (status === 'OK') entry.ok += total;
		else entry.error += total;
		porProcesador.set(pid, entry);
	}

	return porProcesador;
}
