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
	/** Su corrección a mano se hizo en esta extracción anterior y pasó a la vigente al reprocesar (nexus_back, NEX-614). */
	correccionTrasladadaDe?: string | null;
	/** La corrida de la que sale el dato (la vigente). */
	corridaId?: string;
};

/** Una corrección a mano de la extracción anterior que NO pasó a la vigente al reprocesar (NEX-614). `valor` es dato de cliente. */
export type CorreccionSinTrasladar = {
	ruta: string;
	valor: string | null;
	motivo: 'campo_ausente' | 'fila_distinta' | 'otro_tipo' | string;
	deExtraccion: string | null;
	corregidoPor: string | null;
};

/**
 * Una fila de un grupo que se repite que Document AI entregó partida y la extracción volvió a unir (nexus_back,
 * `servicios/filas_partidas.py`): `fila` es la que quedó, `de` las que había entregado Google y `por` los campos que las reconocieron.
 */
export type FilaUnida = { grupo: string; fila: number; de: number[]; por: string[] };

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
	filasUnidas?: FilaUnida[];
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
	correccionesSinTrasladar?: CorreccionSinTrasladar[];
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
	| { tipo: 'tabla'; titulo: string; raiz: string; columnas: string[]; filas: { indice: number; celdas: Record<string, CampoFicha> }[] };

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
			raiz,
			columnas: t.columnas,
			filas: [...t.filas.entries()].sort((a, b) => a[0] - b[0]).map(([indice, celdas]) => ({ indice, celdas }))
		});
	return secciones;
}

/**
 * Para el modo amplio de «Documentos» (Moibe, 2026-11-20: «que se muestre qué datos se extrajeron de cada documento»): las secciones de
 * la ficha con SOLO lo que salió, y los nombres de lo que faltó, para decirlos en un renglón en vez de ocupar una casilla cada uno.
 * Una tabla de lo que se repite se queda entera (sus huecos se ven como «—»), salvo que no traiga ni un valor.
 */
export function datosExtraidos(campos: CampoFicha[]): { secciones: SeccionFicha[]; faltan: string[] } {
	const secciones: SeccionFicha[] = [];
	const faltan: string[] = [];
	for (const s of seccionesDe(campos)) {
		if (s.tipo === 'tabla') {
			if (s.filas.some((f) => Object.values(f.celdas).some((c) => c.valor !== null))) secciones.push(s);
			else faltan.push(s.titulo);
			continue;
		}
		for (const c of s.campos) if (c.valor === null) faltan.push(s.titulo === 'Generales' ? c.etiqueta : `${s.titulo} › ${c.etiqueta}`);
		const conValor = s.campos.filter((c) => c.valor !== null);
		if (conValor.length) secciones.push({ ...s, campos: conValor });
	}
	return { secciones, faltan };
}

export function formatoBytes(n: number): string {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
	return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// ── Filtros y orden de «Documentos», compartidos por la lista y por la ficha (para que las flechas de la ficha sigan el mismo orden) ──
// Viajan en la dirección (`?vista=documentos&formato=lista&org=…&tipo=…&estado=…&q=…&orden=antiguos`): así la lista los conserva al
// regresar y la ficha sabe cuál es el anterior y el siguiente.

export type EstadoTipo = '' | 'activo' | 'inactivo';
/** Por la fecha de la extracción vigente (la que se ve en la lista); sin ella, por la de recepción. */
export type OrdenFecha = 'recientes' | 'antiguos';
/** Qué pestaña de «Datos» se ve. «Por tipo documental» es la de entrada (Moibe, 2026-11-20); «Documentos» va en la dirección
 *  (`?vista=documentos`) para que al volver de una ficha se regrese a la lista de donde se abrió. */
export type VistaDatos = 'tipos' | 'documentos';
/** Cómo se enseñan los documentos. «Amplio» (con los datos de cada uno) es el de entrada (Moibe, 2026-11-20); lista y mosaico van en la
 *  dirección (`?formato=lista`) para que al volver de una ficha se regrese a como se estaban viendo. */
export type FormatoDocumentos = 'amplio' | 'lista' | 'mosaico';
export type FiltrosDocumentos = {
	vista: VistaDatos;
	formato: FormatoDocumentos;
	org: string;
	tipo: string;
	estado: EstadoTipo;
	q: string;
	orden: OrdenFecha;
};

export function filtrosDeUrl(sp: URLSearchParams): FiltrosDocumentos {
	const estado = sp.get('estado');
	const formato = sp.get('formato');
	return {
		vista: sp.get('vista') === 'documentos' ? 'documentos' : 'tipos',
		formato: formato === 'lista' || formato === 'mosaico' ? formato : 'amplio',
		org: sp.get('org') ?? '',
		tipo: sp.get('tipo') ?? '',
		estado: estado === 'activo' || estado === 'inactivo' ? estado : '',
		q: sp.get('q') ?? '',
		orden: sp.get('orden') === 'antiguos' ? 'antiguos' : 'recientes'
	};
}

/** `?org=…` con solo los filtros puestos (la vista, el formato y el orden, solo si no son los de siempre), o `''` si no hay ninguno. */
export function consultaDe(f: FiltrosDocumentos): string {
	const sp = new URLSearchParams();
	if (f.vista === 'documentos') sp.set('vista', 'documentos');
	if (f.formato !== 'amplio') sp.set('formato', f.formato);
	if (f.org) sp.set('org', f.org);
	if (f.tipo) sp.set('tipo', f.tipo);
	if (f.estado) sp.set('estado', f.estado);
	if (f.q.trim()) sp.set('q', f.q.trim());
	if (f.orden === 'antiguos') sp.set('orden', 'antiguos');
	const s = sp.toString();
	return s ? `?${s}` : '';
}

const fechaDe = (d: DocumentoResumen) => {
	const t = Date.parse(d.extraidoEn ?? d.recibidoEn ?? '');
	return Number.isNaN(t) ? null : t;
};

/** Activo = el tipo documental sigue existiendo; inactivo = se borró después de extraer (sus documentos se conservan). */
export const pasaEstadoTipo = (estado: EstadoTipo, existe: boolean | undefined) =>
	!estado || (estado === 'activo' ? existe !== false : existe === false);

/** Filtra y ordena por fecha. Los que no tienen fecha van al final en los dos sentidos; los empates conservan el orden del back. */
export function filtrarDocumentos(docs: DocumentoResumen[], f: FiltrosDocumentos): DocumentoResumen[] {
	const q = f.q.trim().toLowerCase();
	const sentido = f.orden === 'antiguos' ? 1 : -1;
	return docs
		.filter(
			(d) =>
				(!f.org || d.organizacion.guid === f.org) &&
				(!f.tipo || (d.tipoDocumental.nombre ?? d.tipoDocumental.id) === f.tipo) &&
				pasaEstadoTipo(f.estado, d.tipoDocumental.existe) &&
				(!q || d.archivo.toLowerCase().includes(q) || d.id.includes(q))
		)
		.map((d) => ({ d, t: fechaDe(d) }))
		.sort((a, b) => (a.t === null ? (b.t === null ? 0 : 1) : b.t === null ? -1 : (a.t - b.t) * sentido))
		.map(({ d }) => d);
}
