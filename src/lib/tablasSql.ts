// Referencia del esquema SQL Server de Nexus. Es una FOTO, no una lectura en
// vivo: Monitor no se conecta a esa base (la diseña y mantiene el DBA; el back
// solo consume sus stored procedures). Cada entrada dice de dónde salió y
// cuándo se leyó, para que nadie la confunda con el estado de ahora mismo.
//
// Fuente: nexus_back/docs/solicitudes-dba.md, secciones 0c (leído 2026-08-26)
// y 4.0 (leído 2026-09-29). Ambas dicen explícitamente "leído, no supuesto".

export type EstadoTabla = 'con-datos' | 'vacia' | 'no-existe';

export type TablaSql = {
	nombre: string;
	proposito: string;
	columnas: string;
	estado: EstadoTabla;
	nota?: string;
};

export type EsquemaSql = {
	nombre: string;
	descripcion: string;
	tablas: TablaSql[];
};

export const LEIDO_EL = '2026-09-29';

export const ESQUEMAS: EsquemaSql[] = [
	{
		nombre: 'security',
		descripcion: 'Tenants, usuarios y permisos. Es la raíz de todo lo demás.',
		tablas: [
			{
				nombre: 'tenants',
				proposito: 'El cliente. Todo lo demás cuelga de aquí.',
				columnas: 'tenantId (int, interno) · tenantGuid (público)',
				estado: 'vacia',
				nota: 'Sin el tenant de operación de CSI no se puede registrar nada.'
			},
			{
				nombre: 'tenantSequence',
				proposito: 'Genera el código de cada tenant nuevo.',
				columnas: 'prefix · lastSequence · isActive · createdAt/By',
				estado: 'vacia',
				nota: 'El SP lee el prefijo de aquí, no del código.'
			},
			{ nombre: 'users', proposito: 'Usuarios del sistema.', columnas: '—', estado: 'vacia' },
			{
				nombre: 'tenantMemberships',
				proposito: 'Qué usuario pertenece a qué tenant y con qué rol.',
				columnas: '—',
				estado: 'vacia'
			},
			{
				nombre: 'roles',
				proposito: 'Catálogo de roles.',
				columnas: 'ADMIN · CONFIGURATOR · REVIEWER · QUERY',
				estado: 'con-datos'
			},
			{ nombre: 'logsEndpoint', proposito: 'Bitácora de endpoints.', columnas: '—', estado: 'vacia' }
		]
	},
	{
		nombre: 'documents',
		descripcion: 'Los documentos y sus expedientes. Creado el 2026-09-22.',
		tablas: [
			{
				nombre: 'cases',
				proposito: 'El expediente. Cada tenant tiene uno de entrada ("INBOX").',
				columnas: 'caseId (bigint) · caseGuid · tenantId · externalRef · caseStatusId · openedAt/closedAt',
				estado: 'vacia',
				nota: 'UNIQUE(tenantId, externalRef) filtrado: garantiza un solo expediente de entrada por tenant.'
			},
			{
				nombre: 'files',
				proposito: 'El archivo subido, con su ubicación en el almacén.',
				columnas:
					'fileId (bigint) · fileGuid · tenantId · caseId · ingestionChannelId · storageUri · originalFileName · mimeType · sizeBytes · sha256 · pageCount · receivedAt',
				estado: 'vacia',
				nota: 'No hay índice único por (tenantId, sha256): hoy se permiten duplicados.'
			}
		]
	},
	{
		nombre: 'reference',
		descripcion: 'Catálogos. Van aparte por convención del DBA.',
		tablas: [
			{
				nombre: 'tenantStatuses',
				proposito: 'Estados posibles de un tenant.',
				columnas: 'ACTIVE · SUSPENDED · CLOSED',
				estado: 'con-datos'
			},
			{
				nombre: 'ingestionChannels',
				proposito: 'Por dónde entró un archivo.',
				columnas: 'MANUAL · SCRIPT · SFTP · SHAREPOINT · API · ART',
				estado: 'con-datos'
			}
		]
	},
	{
		nombre: 'por definir',
		descripcion: 'Acordadas en el diccionario pero todavía sin crear en la base.',
		tablas: [
			{
				nombre: 'config_version',
				proposito: 'Versión de la configuración de un tipo documental.',
				columnas: '—',
				estado: 'no-existe'
			},
			{
				nombre: 'field_definition',
				proposito: 'Catálogo de campos que se extraen.',
				columnas: '—',
				estado: 'no-existe'
			},
			{
				nombre: 'extractor_field_map',
				proposito: 'Traduce lo que emite el motor al campo del catálogo.',
				columnas: 'id · config_version_id · field_definition_id · engine',
				estado: 'no-existe'
			},
			{
				nombre: 'extractor_binding',
				proposito: 'Amarra una versión de configuración a su procesador.',
				columnas: '—',
				estado: 'no-existe'
			},
			{
				nombre: 'extraction_run',
				proposito: 'Cada corrida de extracción sobre un documento.',
				columnas: '—',
				estado: 'no-existe'
			},
			{
				nombre: 'few_shot_example',
				proposito: 'Ejemplos para la configuración KIE.',
				columnas: '—',
				estado: 'no-existe'
			}
		]
	}
];

// Índice por nombre de tabla, para ponerle contexto humano a lo que llega en
// vivo del back. La base sabe qué tablas hay y cuántas filas tienen; lo que
// NO sabe es para qué sirve cada una — eso sale de aquí.
//
// La búsqueda es por nombre de tabla y no por `esquema.tabla` a propósito: una
// tabla "por definir" que mañana aparezca de verdad en `documents` debe
// conservar su descripción sin que haya que tocar este archivo.
const POR_NOMBRE = new Map<string, TablaSql>(
	ESQUEMAS.flatMap((e) => e.tablas.map((t) => [t.nombre.toLowerCase(), t] as const))
);

export function descripcionDe(tabla: string): TablaSql | undefined {
	return POR_NOMBRE.get(tabla.toLowerCase());
}

// Convenciones del DBA, útiles al leer cualquier tabla de arriba.
export const CONVENCIONES = [
	'Borrado lógico: `isActive` + `isDeleted`, nunca DELETE físico.',
	'Auditoría en todas: `createdAt` / `createdBy` / `updatedAt` / `updatedBy`.',
	'PK `int IDENTITY` interna + `uniqueidentifier` público (ej. `tenantId` y `tenantGuid`).',
	'Catálogos con `code` / `name` / `description` / `sortOrder`, en el esquema `reference`.',
	'Nombres en inglés camelCase.'
];
