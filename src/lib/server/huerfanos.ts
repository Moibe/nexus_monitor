import { AMBIENTES, type Ambiente } from '$lib/ambientes';
import { configDe } from '$lib/server/ambientes';
import { listarProcesadores } from '$lib/server/docai';
import { idCorto, type Procesador } from '$lib/procesadores';

// Procesadores huérfanos: los `nexusdoc--…` que ningún tipo documental señala. Es lo que antes se hacía con
// `limpiar_procesadores_huerfanos.py` en una terminal del servidor del back; las reglas son las de su
// `servicios/procesadores_huerfanos.py`, copiadas aquí.
//
// La diferencia, y la razón de que esto viva en Monitor: el proyecto de Google es UNO para dev, staging y prod,
// pero cada back solo conoce los tipos de SU almacén. Un procesador sin dueño en dev puede tenerlo en prod. El
// script lo esquivaba con un corte por fecha; aquí se le pregunta a los TRES backs (`GET /duenos-procesadores/`)
// y solo es huérfano lo que no tiene dueño en ninguno. Si un ambiente no contesta, no se clasifica NADA: con un
// ambiente a ciegas, cualquier "huérfano" podría ser suyo.

const PREFIJO_EXTRACTOR = 'nexusdoc--';
const PREFIJO_CLASIFICADOR_ORGANIZACION = 'nexusdoc-clasificador--';

export type Dueno = { ambiente: Ambiente; tenant: string; tipo: string };

type DuenosDeAmbiente = {
	conDueno: Record<string, { tenant: string; tipo: string; version?: number }>;
	organizaciones: string[];
	protegidos: string[];
};

export type ProcesadorResumido = { id: string; displayName: string; createTime: string };

export type Reparto = {
	huerfanos: ProcesadorResumido[];
	conDueno: (ProcesadorResumido & { duenos: Dueno[] })[];
	protegidos: ProcesadorResumido[];
	/** Ids que algún tipo señala y que ya no existen en Google (solo aviso, no se toca nada). */
	sueltos: { id: string; duenos: Dueno[] }[];
};

/** Un ambiente al que no se le pudo preguntar, y por qué. */
export class AmbienteSinRespuesta extends Error {
	fallas: { ambiente: Ambiente; motivo: string }[];

	constructor(fallas: { ambiente: Ambiente; motivo: string }[]) {
		super(
			'No se puede saber qué es huérfano sin preguntarle a los tres ambientes. Faltó: ' +
				fallas.map((f) => `${f.ambiente} (${f.motivo})`).join('; ') +
				'.'
		);
		this.name = 'AmbienteSinRespuesta';
		this.fallas = fallas;
	}
}

async function duenosDe(ambiente: Ambiente): Promise<DuenosDeAmbiente> {
	const { url, key } = configDe(ambiente);
	const r = await fetch(`${url}/duenos-procesadores/`, {
		headers: { 'X-API-Key': key },
		signal: AbortSignal.timeout(30_000)
	});
	if (r.status === 404) throw new Error('su nexus_back todavía no tiene /duenos-procesadores');
	if (!r.ok) throw new Error(`nexus_back respondió ${r.status}`);
	return (await r.json()) as DuenosDeAmbiente;
}

const resumir = (p: Procesador): ProcesadorResumido => ({
	id: idCorto(p.name),
	displayName: p.displayName ?? '',
	createTime: p.createTime
});

/** Lista Google, junta lo de los tres ambientes y reparte. Lanza `AmbienteSinRespuesta` si alguno no contestó. */
export async function repartirProcesadores(): Promise<Reparto> {
	const [procesadores, ...respuestas] = await Promise.all([
		listarProcesadores(),
		...AMBIENTES.map((a) =>
			duenosDe(a.id).then(
				(d) => ({ ambiente: a.id, d }),
				(e: unknown) => ({ ambiente: a.id, motivo: e instanceof Error ? e.message : String(e) })
			)
		)
	]);

	const fallas = respuestas.filter((r): r is { ambiente: Ambiente; motivo: string } => 'motivo' in r);
	if (fallas.length > 0) throw new AmbienteSinRespuesta(fallas);

	const duenos = new Map<string, Dueno[]>();
	const organizaciones = new Set<string>();
	const protegidosIds = new Set<string>();
	for (const r of respuestas as { ambiente: Ambiente; d: DuenosDeAmbiente }[]) {
		for (const [id, info] of Object.entries(r.d.conDueno)) {
			duenos.set(id, [...(duenos.get(id) ?? []), { ambiente: r.ambiente, tenant: info.tenant, tipo: info.tipo }]);
		}
		r.d.organizaciones.forEach((g) => organizaciones.add(g));
		r.d.protegidos.forEach((i) => protegidosIds.add(i));
	}

	const reparto: Reparto = { huerfanos: [], conDueno: [], protegidos: [], sueltos: [] };
	for (const p of procesadores.map(resumir)) {
		const nombre = p.displayName;
		if (protegidosIds.has(p.id)) {
			reparto.protegidos.push(p);
		} else if (nombre.startsWith(PREFIJO_CLASIFICADOR_ORGANIZACION)) {
			// El clasificador de una organización lo señala la organización, no un tipo: es huérfano solo si esa
			// organización no existe en NINGÚN ambiente.
			const vivo = organizaciones.has(nombre.slice(PREFIJO_CLASIFICADOR_ORGANIZACION.length));
			(vivo ? reparto.protegidos : reparto.huerfanos).push(p);
		} else if (!nombre.startsWith(PREFIJO_EXTRACTOR)) {
			// No es de la aplicación (o es el clasificador del espacio de plataforma): no se toca.
			reparto.protegidos.push(p);
		} else if (duenos.has(p.id)) {
			reparto.conDueno.push({ ...p, duenos: duenos.get(p.id)! });
		} else {
			reparto.huerfanos.push(p);
		}
	}

	const enGoogle = new Set(procesadores.map((p) => idCorto(p.name)));
	for (const [id, d] of duenos) if (!enGoogle.has(id)) reparto.sueltos.push({ id, duenos: d });

	return reparto;
}
