// Quién puede ver y hacer qué en NexusDoc / Biblioratum, por rol. Alimenta la sección «Roles» de Monitor.
//
// Módulo UNIVERSAL (sin credenciales), como `ambientes.ts` y `tablasSql.ts`.
//
// ⚠️ ES UNA COPIA, no la fuente. Quien MANDA es nexus_back (`servicios/roles.py`: PUEDEN_ADMINISTRAR, PUEDEN_ORGANIZAR, PUEDEN_DESCARTAR),
// que responde 403 `sin_permiso` aunque una pantalla le ofrezca algo a quien no le toca; el front (`src/lib/usuarios/permisos.ts`) solo
// decide qué se OFRECE. Si cambia una regla, cambia en los tres lados: back, front y aquí. `verificar_roles_copias.py` (en nexus_back)
// compara estos conjuntos contra los del back y los del front y falla si dicen cosas distintas, así que no hay que acordarse.
// Para que esa comprobación pueda leerlos, cada conjunto de `QUIENES` va en UNA línea con la forma `nombre: ['ROL', 'ROL']`.

export type RolCodigo = 'ADMIN' | 'SUPERVISOR' | 'ANALISTA' | 'OPERADOR' | 'COMPLIANCE_OFFICER' | 'AUDITOR' | 'VIEWER';

export type Rol = {
	codigo: RolCodigo;
	nombre: string;
	/** Para el encabezado de la columna, que es angosta. */
	corto: string;
	/** Lo que el DISEÑO (Sprint 1, HU07) dice que hace el rol. Mucho de eso todavía no existe en el producto. */
	diseno: string;
};

// El orden es el de la tabla, de izquierda a derecha: primero los que administran, luego los que trabajan, luego los de consulta.
export const ROLES: Rol[] = [
	{
		codigo: 'ADMIN',
		nombre: 'Administrador',
		corto: 'Administrador',
		diseno:
			'El administrador de la organización: nace con ella (HU02). No se asigna desde el alta de usuarios, pero sí se muestra en el listado.'
	},
	{
		codigo: 'SUPERVISOR',
		nombre: 'Supervisor',
		corto: 'Supervisor',
		diseno:
			'Monitorea cola HITL, métricas del equipo, reasigna casos, panel de calidad del pipeline, ve log de actividad de otros usuarios, marca alertas como revisadas.'
	},
	{
		codigo: 'ANALISTA',
		nombre: 'Analista',
		corto: 'Analista',
		diseno:
			'Revisa cola HITL, corrige campos, resuelve casos estándar, consulta expediente, búsqueda semántica, exporta resultados de búsqueda.'
	},
	{
		codigo: 'OPERADOR',
		nombre: 'Operador',
		corto: 'Operador',
		diseno: 'Carga documentos manualmente, edita metadata básica, descarga archivo original, consulta bandeja de documentos.'
	},
	{
		codigo: 'COMPLIANCE_OFFICER',
		nombre: 'Compliance Officer',
		corto: 'Compliance',
		diseno:
			'Resuelve casos de alerta PLD, atiende solicitudes ARCO, ve campos sin enmascarar, exporta reportes de auditoría, ve eventos PLD del audit trail.'
	},
	{
		codigo: 'AUDITOR',
		nombre: 'Auditor',
		corto: 'Auditor',
		diseno:
			'Revisa trazabilidad de decisiones, línea de tiempo de auditoría (eventos públicos), ve OT-01 y OT-02 sin poder descargar, exporta reportes de auditoría.'
	},
	{
		codigo: 'VIEWER',
		nombre: 'Viewer',
		corto: 'Viewer',
		diseno:
			'Consulta OT-01 y OT-02 en modo lectura sin descarga, ve historial de firmas y línea de tiempo de auditoría (eventos públicos únicamente).'
	}
];

// Los conjuntos de roles que usa la tabla. Una línea por conjunto (ver la nota de arriba).
//   todos       → cualquiera que pertenezca a una organización: lee y opera el pipeline (`aislamiento.exigir`)
//   administran → `roles.PUEDEN_ADMINISTRAR`: configurar lo que un tercero usa y lo que define cómo se procesa
//   organizan   → `roles.PUEDEN_ORGANIZAR` y `roles.PUEDEN_DESCARTAR` (hoy son el mismo conjunto): mover el trabajo
//   soloAdmin   → el administrador de la organización, y nadie más de ella
//   ninguno     → ningún rol de una organización: solo el administrador de plataforma
export const QUIENES = {
	todos: ['ADMIN', 'SUPERVISOR', 'ANALISTA', 'OPERADOR', 'COMPLIANCE_OFFICER', 'AUDITOR', 'VIEWER'],
	administran: ['ADMIN', 'SUPERVISOR'],
	organizan: ['ADMIN', 'SUPERVISOR', 'ANALISTA', 'OPERADOR'],
	soloAdmin: ['ADMIN'],
	ninguno: []
} as const satisfies Record<string, readonly RolCodigo[]>;

export type Quienes = keyof typeof QUIENES;

/** En qué punto está la regla. */
export type EstadoRegla = 'abierto' | 'propuesta' | 'diseno' | 'decision';

export const ESTADOS: Record<EstadoRegla, { etiqueta: string; ayuda: string }> = {
	abierto: { etiqueta: 'Sin restricción por rol', ayuda: 'Cualquier persona de la organización.' },
	propuesta: {
		etiqueta: 'Propuesta, por confirmar con César',
		ayuda: 'Es lo que está puesto hoy, pero es una propuesta de producto que César todavía no confirma.'
	},
	diseno: { etiqueta: 'Del diseño', ayuda: 'Así lo pide el diseño de la historia que se indica.' },
	decision: { etiqueta: 'Decisión de Moibe', ayuda: 'Decidido por el dueño del producto.' }
};

export type Capacidad = {
	grupo: 'pantallas' | 'acciones';
	nombre: string;
	/** Qué incluye, cuando el nombre solo no alcanza. */
	detalle?: string;
	quienes: Quienes;
	estado: EstadoRegla;
	/** Dónde se decide, para quien tenga que cambiarlo. */
	decide: string;
	/** Existe en el menú o en la API, pero todavía no tiene pantalla. */
	sinPantalla?: boolean;
};

export const GRUPOS: Record<Capacidad['grupo'], { titulo: string; ayuda: string }> = {
	pantallas: { titulo: 'Qué se VE: menús y pantallas', ayuda: 'Lo que aparece en la barra de arriba y en el engrane.' },
	acciones: { titulo: 'Qué se HACE', ayuda: 'Lo que el servidor deja o rechaza, aunque alguien llegue a la pantalla por su dirección.' }
};

export const CAPACIDADES: Capacidad[] = [
	// ── Qué se ve ──────────────────────────────────────────────────────────────────────────────────────────────────────
	{
		grupo: 'pantallas',
		nombre: 'Inicio: centro operativo documental',
		detalle: 'Carga documental, bandeja de preparación y pipeline.',
		quienes: 'todos',
		estado: 'abierto',
		decide: 'back: aislamiento.exigir'
	},
	{
		grupo: 'pantallas',
		nombre: 'Consultar expedientes, archivos procesados y sus datos extraídos',
		quienes: 'todos',
		estado: 'abierto',
		decide: 'back: aislamiento.exigir'
	},
	{
		grupo: 'pantallas',
		nombre: 'Módulo de uso (engrane)',
		detalle: 'Lleva al centro operativo documental y a los expedientes.',
		quienes: 'todos',
		estado: 'decision',
		decide: 'front: permisos.ts → puedeUsar'
	},
	{
		grupo: 'pantallas',
		nombre: 'Módulo de configuración (engrane)',
		detalle: 'Tipos documentales, tipos de expediente virtual, procesos y reglas.',
		quienes: 'administran',
		estado: 'propuesta',
		decide: 'back: roles.PUEDEN_ADMINISTRAR · front: permisos.ts'
	},
	{
		grupo: 'pantallas',
		nombre: 'Motor de reglas (engrane)',
		quienes: 'administran',
		estado: 'propuesta',
		decide: 'back: roles.PUEDEN_ADMINISTRAR · front: permisos.ts'
	},
	{
		grupo: 'pantallas',
		nombre: 'Conectores (engrane)',
		detalle: 'Queda con quien administra hasta que exista y se defina quién más lo usa.',
		quienes: 'administran',
		estado: 'propuesta',
		decide: 'front: permisos.ts',
		sinPantalla: true
	},
	{
		grupo: 'pantallas',
		nombre: 'Auditoría y trazabilidad (engrane)',
		detalle: 'El diseño habla de Auditor y Compliance Officer para esto; se define cuando exista.',
		quienes: 'administran',
		estado: 'propuesta',
		decide: 'front: permisos.ts',
		sinPantalla: true
	},
	{
		grupo: 'pantallas',
		nombre: 'API Key (engrane)',
		quienes: 'administran',
		estado: 'propuesta',
		decide: 'back: roles.PUEDEN_ADMINISTRAR · front: permisos.ts'
	},
	{
		grupo: 'pantallas',
		nombre: 'Webhooks (engrane)',
		quienes: 'administran',
		estado: 'propuesta',
		decide: 'back: roles.PUEDEN_ADMINISTRAR · front: permisos.ts'
	},
	{
		grupo: 'pantallas',
		nombre: 'Usuarios (barra de arriba)',
		quienes: 'soloAdmin',
		estado: 'diseno',
		decide: 'back: routers/usuarios.py (HU06) · front: TopBar'
	},
	{
		grupo: 'pantallas',
		nombre: 'Organizaciones (barra de arriba)',
		quienes: 'ninguno',
		estado: 'diseno',
		decide: 'back: routers/organizaciones.py (HU02) · front: TopBar'
	},
	// ── Qué se hace ────────────────────────────────────────────────────────────────────────────────────────────────────
	{
		grupo: 'acciones',
		nombre: 'Procesar documentos',
		detalle: 'Cargar a mano, clasificar, extraer, reintentar y quitar del pipeline.',
		quienes: 'todos',
		estado: 'abierto',
		decide: 'back: aislamiento.exigir'
	},
	{
		grupo: 'acciones',
		nombre: 'Leer los tipos documentales',
		detalle: 'El pipeline los necesita para clasificar.',
		quienes: 'todos',
		estado: 'abierto',
		decide: 'back: aislamiento.exigir'
	},
	{
		grupo: 'acciones',
		nombre: 'Descartar un documento de la bandeja de preparación',
		quienes: 'organizan',
		estado: 'propuesta',
		decide: 'back: roles.PUEDEN_DESCARTAR'
	},
	{
		grupo: 'acciones',
		nombre: 'Organizar expedientes',
		detalle: 'Crear expedientes, agregar o quitar documentos, armar y borrar expedientes virtuales.',
		quienes: 'organizan',
		estado: 'propuesta',
		decide: 'back: roles.PUEDEN_ORGANIZAR · front: permisos.ts'
	},
	{
		grupo: 'acciones',
		nombre: 'Corregir a mano un dato extraído',
		quienes: 'organizan',
		estado: 'propuesta',
		decide: 'back: roles.PUEDEN_ORGANIZAR',
		sinPantalla: true
	},
	{
		grupo: 'acciones',
		nombre: 'Crear, cambiar, calibrar, activar y borrar tipos documentales',
		quienes: 'administran',
		estado: 'propuesta',
		decide: 'back: roles.PUEDEN_ADMINISTRAR'
	},
	{
		grupo: 'acciones',
		nombre: 'Crear, cambiar y borrar tipos de expediente virtual',
		detalle: 'Verlos, en cambio, es de todos.',
		quienes: 'administran',
		estado: 'propuesta',
		decide: 'back: roles.PUEDEN_ADMINISTRAR'
	},
	{
		grupo: 'acciones',
		nombre: 'Ver y editar los procesos del motor de reglas',
		quienes: 'administran',
		estado: 'propuesta',
		decide: 'back: roles.PUEDEN_ADMINISTRAR'
	},
	{
		grupo: 'acciones',
		nombre: 'Emitir y revocar API Keys; registrar, validar y eliminar webhooks',
		detalle: 'Con sus métricas e historial.',
		quienes: 'administran',
		estado: 'propuesta',
		decide: 'back: roles.PUEDEN_ADMINISTRAR'
	},
	{
		grupo: 'acciones',
		nombre: 'Dar de alta usuarios, cambiarles el rol, desactivarlos, cerrarles la sesión y reenviar su invitación',
		quienes: 'soloAdmin',
		estado: 'diseno',
		decide: 'back: routers/usuarios.py (HU06, HU07)'
	},
	{
		grupo: 'acciones',
		nombre: 'Crear organizaciones y su administrador',
		quienes: 'ninguno',
		estado: 'diseno',
		decide: 'back: routers/organizaciones.py (HU02)'
	}
];

/** Cuándo se leyó el código para armar esta tabla. */
export const LEIDO_EL = '2026-10-30';
