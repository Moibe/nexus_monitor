// Tipos y parseo de procesadores de Document AI. Vive FUERA de `lib/server/`
// a propósito: no contiene ningún secreto (nada de tokens ni rutas de
// credenciales), y la página lo necesita para agrupar/formatear en el cliente.
// `lib/server/docai.ts` importa el tipo `Procesador` de aquí en vez de
// declarar el suyo, para que ambos lados compartan una sola definición.

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

export type Origen = 'nexusdoc' | 'nexusdoc-sinversion' | 'clasificador' | 'legado';

export type NombreParseado = {
	origen: Origen;
	tipoId: string | null;
	version: number | null;
	slug: string | null;
};

export function parsearDisplayName(displayName: string | undefined): NombreParseado {
	const dn = displayName ?? '';
	// El clasificador PRIMERO: usa UN solo guion, así que sin este caso
	// especial caería en 'legado'.
	if (dn === 'nexusdoc-clasificador')
		return { origen: 'clasificador', tipoId: null, version: null, slug: null };
	if (!dn.startsWith('nexusdoc--'))
		return { origen: 'legado', tipoId: null, version: null, slug: null };

	const partes = dn.split('--');
	const tipoId = partes[1] ?? '';
	// Contra el SEGMENTO COMPLETO, no como prefijo: 'v10'.startsWith('v1') es
	// true, y esa comparación ingenua ya mordió a este proyecto del lado de
	// Python (ver el comentario en procesadores.py:202-206 de nexus_back).
	const m = /^v(\d+)$/.exec(partes[2] ?? '');
	const version = m ? Number(m[1]) : null;
	const slug = partes.slice(m ? 3 : 2).join('--');
	return {
		origen: version === null ? 'nexusdoc-sinversion' : 'nexusdoc',
		tipoId,
		version,
		slug
	};
}

// El id corto sale del último segmento del resource name. NUNCA por longitud
// fija: en los 45 reales, 43 ids miden 16 caracteres y 2 miden 15 (hexadecimal
// sin ceros a la izquierda).
export function idCorto(name: string): string {
	return name.split('/').at(-1) ?? name;
}

export type ProcesadorParseado = Procesador & NombreParseado & { id: string };

export type Grupo = {
	/** null para el grupo de clasificador y el de legados. */
	tipoId: string | null;
	origen: Origen;
	titulo: string;
	procesadores: ProcesadorParseado[];
};

/**
 * Agrupa por `tipoId` (nexusdoc y nexusdoc-sinversion del mismo tipo caen en
 * el mismo grupo, porque `parsearDisplayName` ya los identifica con el mismo
 * `tipoId`), más un grupo aparte para el clasificador y otro — una sola
 * bolsa, no uno por procesador — para los legados sin prefijo. Total esperado
 * contra los 45 reales: 19 grupos de tipo + clasificador + bolsa de legados.
 */
export function agruparProcesadores(procesadores: Procesador[]): Grupo[] {
	const parseados: ProcesadorParseado[] = procesadores.map((p) => ({
		...p,
		id: idCorto(p.name),
		...parsearDisplayName(p.displayName)
	}));

	const porTipo = new Map<string, ProcesadorParseado[]>();
	const clasificador: ProcesadorParseado[] = [];
	const legado: ProcesadorParseado[] = [];

	for (const p of parseados) {
		if (p.origen === 'clasificador') {
			clasificador.push(p);
			continue;
		}
		if (p.origen === 'legado') {
			legado.push(p);
			continue;
		}
		const key = p.tipoId ?? '';
		const grupo = porTipo.get(key);
		if (grupo) grupo.push(p);
		else porTipo.set(key, [p]);
	}

	const gruposTipo: Grupo[] = [...porTipo.entries()].map(([tipoId, items]) => {
		// Ordena por versión, no por fecha: tres tipos reales tienen dos
		// versiones creadas en el mismo minuto y la fecha se muestra a
		// minutos, así que por fecha el orden sería arbitrario. Los sin
		// versión (nexusdoc-sinversion) van al final del grupo.
		const ordenados = [...items].sort((a, b) => (b.version ?? -1) - (a.version ?? -1));
		// El slug deriva entre versiones del mismo tipo (el usuario renombra
		// el tipo documental y Document AI no permite renombrar un procesador
		// ya creado), así que el título toma el slug de la versión MÁS ALTA,
		// no el primero que aparezca.
		const slugTitulo = ordenados[0]?.slug || tipoId;
		// El tipoId va SIEMPRE al lado del slug: 6 tipos documentales
		// distintos se llaman "ine" y 4 se llaman "pasaporte" en los datos
		// reales. Un título de solo slug miente.
		return {
			tipoId,
			origen: 'nexusdoc' as Origen,
			titulo: `${slugTitulo} (${tipoId})`,
			procesadores: ordenados
		};
	});

	gruposTipo.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));

	const grupos: Grupo[] = [...gruposTipo];
	if (clasificador.length) {
		grupos.push({
			tipoId: null,
			origen: 'clasificador',
			titulo: 'Clasificador',
			procesadores: clasificador
		});
	}
	if (legado.length) {
		// Una sola bolsa, no un grupo por procesador: son 5 nombres sin
		// relación entre sí (ine, sat_csf, cedula...), no versiones de un
		// mismo tipo. Y NUNCA ocultos por default: `ine` es el procesador más
		// usado de todo el proyecto, con casi 500 documentos.
		grupos.push({
			tipoId: null,
			origen: 'legado',
			titulo: 'Legado (creados a mano en la consola)',
			procesadores: legado
		});
	}

	return grupos;
}

const formateadorFecha = new Intl.DateTimeFormat('es-MX', {
	dateStyle: 'medium',
	timeStyle: 'short'
});

// `createTime` llega en ISO-8601 UTC con seis decimales. Se muestra en la hora
// local de quien mira (Intl.DateTimeFormat sin `timeZone` explícito usa la del
// entorno de ejecución).
export function formatFecha(iso: string): string {
	try {
		return formateadorFecha.format(new Date(iso));
	} catch {
		return iso;
	}
}
