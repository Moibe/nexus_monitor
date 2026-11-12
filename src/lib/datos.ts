// La sección «Datos»: lo que Document AI leyó de cada documento, tal como lo entrega `GET /monitor-datos/` de nexus_back.
// Módulo UNIVERSAL (tipos y utilidades de presentación); el enmascarado de producción vive en `lib/server/enmascarar.ts`.

export type Org = { guid: string; nombre: string | null };
/** `existe: false` = el tipo se borró después de extraer; la corrida conserva su id y nombre de entonces. */
export type TipoRef = { id: string; nombre: string | null; revision?: number | null; existe?: boolean };
export type EstadoCorrida = 'ok' | 'no_reconocido' | 'error';

export type DocumentoResumen = {
	id: string;
	organizacion: Org;
	archivo: string;
	mime: string;
	bytes: number;
	recibidoEn: string | null;
	tipoDocumental: TipoRef;
	estado: EstadoCorrida;
	error: string | null;
	confianzaPromedio: number | null;
	confianzaMinima: number | null;
	paginas: number | null;
	extraidoEn: string | null;
	corridas: number;
	campos: number;
	conValor: number;
	ausentes: number;
	corregidos: number;
};

export type CampoDeTipo = {
	ruta: string;
	nombre: string;
	veces: number;
	conValor: number;
	ausentes: number;
	corregidos: number;
	confianzaPromedio: number | null;
	confianzaMinima: number | null;
};

export type TipoResumen = {
	id: string;
	nombre: string | null;
	existe?: boolean;
	organizacion: Org;
	documentos: number;
	confianzaPromedio: number | null;
	campos: CampoDeTipo[];
};

export type Panorama = {
	sinBase: boolean;
	limite?: number;
	documentos: DocumentoResumen[];
	tipos: TipoResumen[];
	/** Lo pone Monitor, no el back: en producción los valores llegan enmascarados. */
	enmascarado?: boolean;
};

export type CampoFicha = {
	ruta: string;
	nombre: string;
	registro: number | null;
	valor: string | null;
	valorCrudo: string | null;
	valorExtraido: string | null;
	motivoSinValor: string | null;
	confianza: number | null;
	pagina: number | null;
	corregido: boolean;
	corregidoEn: string | null;
	corregidoPor: string | null;
};

export type Corrida = {
	id: string;
	tipoDocumental: TipoRef;
	procesador: { id: string; version: string | null };
	estado: EstadoCorrida;
	error: string | null;
	confianzaPromedio: number | null;
	confianzaMinima: number | null;
	paginas: number | null;
	terminadaEn: string | null;
	extraidoPor: string;
	campos: number;
};

export type Ficha = {
	id: string;
	organizacion: Org;
	archivo: string;
	mime: string;
	bytes: number;
	canal: string;
	recibidoEn: string | null;
	clasificacion: { categoria: string | null; tipoDocumental: TipoRef | null; confianza: number | null; clasificadoEn: string | null } | null;
	extraccion: { estado: EstadoCorrida; confianzaPromedio: number | null; confianzaMinima: number | null; paginas: number | null } | null;
	campos: CampoFicha[];
	corridas: Corrida[];
	enmascarado?: boolean;
};

// ── Presentación ──────────────────────────────────────────────────────────────────────────────────────────────────────

export type Nivel = 'alta' | 'media' | 'baja' | 'nula';

/** Verde de 90 para arriba, ámbar de 70 a 90, rojo abajo. Los mismos cortes en toda la sección. */
export function nivelDe(confianza: number | null | undefined): Nivel {
	if (confianza === null || confianza === undefined) return 'nula';
	if (confianza >= 90) return 'alta';
	if (confianza >= 70) return 'media';
	return 'baja';
}

export const ETIQUETA_ESTADO: Record<EstadoCorrida, string> = {
	ok: 'Extraído',
	no_reconocido: 'No reconocido',
	error: 'Falló'
};

export const MOTIVO_SIN_VALOR: Record<string, string> = {
	not_present: 'No apareció',
	illegible: 'Ilegible',
	below_threshold: 'Confianza muy baja',
	extraction_error: 'La extracción falló'
};

/** `razon_social` → «Razón social» no se puede adivinar; basta con «Razon social». */
export function etiquetaDe(nombre: string): string {
	const t = nombre.replace(/[_-]+/g, ' ').trim();
	return t ? t[0].toUpperCase() + t.slice(1) : nombre;
}

export type SeccionFicha =
	| { tipo: 'simple'; titulo: string; campos: (CampoFicha & { etiqueta: string })[] }
	| { tipo: 'tabla'; titulo: string; columnas: string[]; filas: { indice: number; celdas: Record<string, CampoFicha> }[] };

/**
 * Acomoda los campos de una ficha como se leen en papel: los sueltos juntos («Generales»), los de un grupo bajo su nombre
 * (`domicilio.calle` → «Domicilio» › Calle) y lo que se repite como tabla (`socios[2].nombre` → fila 2, columna Nombre).
 */
export function seccionesDe(campos: CampoFicha[]): SeccionFicha[] {
	const generales: (CampoFicha & { etiqueta: string })[] = [];
	const grupos = new Map<string, (CampoFicha & { etiqueta: string })[]>();
	type Tabla = { columnas: string[]; filas: Map<number, Record<string, CampoFicha>> };
	const tablas = new Map<string, Tabla>();

	for (const c of campos) {
		const corchete = c.ruta.indexOf('[');
		if (corchete >= 0) {
			const raiz = c.ruta.slice(0, corchete);
			const m = /^\[(\d+)\](?:\.(.+))?/.exec(c.ruta.slice(corchete));
			const indice = m ? Number(m[1]) : (c.registro ?? 1);
			// Lo que va después de la primera fila puede tener más niveles (`socios[1].domicilio.calle`): se aplana con «›».
			const columna = m?.[2] ? m[2].replace(/\[\d+\]/g, '').split('.').map(etiquetaDe).join(' › ') : 'Valor';
			const t: Tabla = tablas.get(raiz) ?? { columnas: [], filas: new Map() };
			if (!t.columnas.includes(columna)) t.columnas.push(columna);
			const fila = t.filas.get(indice) ?? {};
			fila[columna] = c;
			t.filas.set(indice, fila);
			tablas.set(raiz, t);
		} else if (c.ruta.includes('.')) {
			const [raiz, ...resto] = c.ruta.split('.');
			const lista = grupos.get(raiz) ?? [];
			lista.push({ ...c, etiqueta: resto.map(etiquetaDe).join(' › ') });
			grupos.set(raiz, lista);
		} else {
			generales.push({ ...c, etiqueta: etiquetaDe(c.nombre || c.ruta) });
		}
	}

	const secciones: SeccionFicha[] = [];
	if (generales.length) secciones.push({ tipo: 'simple', titulo: 'Generales', campos: generales });
	for (const [raiz, lista] of grupos) secciones.push({ tipo: 'simple', titulo: etiquetaDe(raiz), campos: lista });
	for (const [raiz, t] of tablas)
		secciones.push({
			tipo: 'tabla',
			titulo: etiquetaDe(raiz),
			columnas: t.columnas,
			filas: [...t.filas.entries()].sort((a, b) => a[0] - b[0]).map(([indice, celdas]) => ({ indice, celdas }))
		});
	return secciones;
}

export function formatoBytes(n: number): string {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
	return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
