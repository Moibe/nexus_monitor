import { env } from '$env/dynamic/private';

// Monitor NO se conecta a SQL Server: le pregunta a nexus_back, que es quien
// tiene las credenciales, el driver ODBC y la relación con el DBA. Así esas
// credenciales siguen viviendo en UN solo lugar — y no en este repo, que es
// público y además puede borrar procesadores.
//
// Sin default a propósito, igual que DOCAI_PROJECT_ID: un host quemado aquí
// apuntaría en silencio al back equivocado (prod y dev leen la MISMA base
// IA_Nexus, así que el error no se notaría por los datos).
const API_URL = env.NEXUS_API_URL;
const API_KEY = env.NEXUS_API_KEY;

export type TablaViva = {
	esquema: string;
	tabla: string;
	filas: number;
};

/**
 * Inventario de tablas tal como está la base AHORA. El endpoint lo sirve
 * nexus_back (`GET /esquema/tablas`, solo lectura, solo metadatos).
 *
 * Ojo: ese endpoint vive hoy solo en la rama `dev` del back (puerto 8084). Si
 * `NEXUS_API_URL` apunta al back de producción (8083) responderá 404 hasta que
 * el cambio se promueva allá.
 */
export async function obtenerTablas(): Promise<TablaViva[]> {
	if (!API_URL) throw new Error('Falta NEXUS_API_URL: apunta al nexus_back que sirve /esquema.');
	if (!API_KEY) throw new Error('Falta NEXUS_API_KEY: es la misma llave de servicio del front.');

	const r = await fetch(`${API_URL.replace(/\/$/, '')}/esquema/tablas`, {
		headers: { 'X-API-Key': API_KEY },
		signal: AbortSignal.timeout(30_000)
	});

	if (!r.ok) {
		throw new Error(`nexus_back ${r.status}: ${(await r.text()).slice(0, 300)}`);
	}

	const cuerpo = await r.json();
	return cuerpo.tablas ?? [];
}

// ─── Administradores de plataforma (Superadmins) ───────────────────────────
//
// Un administrador de plataforma no se da de alta desde NexusDoc sino desde fuera, por quien opera el sistema: esa es la razón de
// que esto viva en Monitor. Antes eran tres scripts en una terminal del servidor del back (`bootstrap_admin.py`,
// `reenviar_invitacion.py`, `retirar_cuenta.py`); nexus_back ahora expone lo mismo en `/admins-plataforma` y aquí solo se le pregunta.
//
// ⚠️ SIN PROTECCIÓN EXTRA (decisión del usuario, 2026-10-20): esas rutas piden solo la llave de servicio, y Monitor no tiene login.
// Quien abra Monitor desde la VPN puede crear un administrador de plataforma. Cuando se quiera cerrar, aquí es donde se pide
// una llave de administración tecleada; ver el docstring de `routers/admins_plataforma.py` en nexus_back.

export type EstadoAdmin = 'pendiente' | 'activo' | 'inactivo';

export type AdminPlataforma = {
	guid: string;
	email: string;
	nombre: string;
	apellidos: string;
	estado: EstadoAdmin;
	creadoEn: string | null;
	ultimoLoginEn: string | null;
	temporalEmitidaEn: string | null;
	sesionActiva: boolean;
};

/** Qué pasó con el correo de bienvenida. `omitido` es cuando se pidió no mandarlo. */
export type CorreoDeBienvenida = 'enviado' | 'sin_canal' | 'fallo' | 'omitido';

/** Lo que devuelven crear y regenerar: la contraseña temporal viene SIEMPRE (es el respaldo de quien opera) y no se vuelve a ver. */
export type AccesoNuevo = {
	administrador: AdminPlataforma;
	correo: CorreoDeBienvenida;
	contrasenaTemporal: string;
};

/** Lo que nexus_back contestó cuando algo salió mal: su código HTTP, el texto (ya en español, hecho para mostrarse) y, si lo trae, un código. */
export class ErrorNexusBack extends Error {
	status: number;
	codigo?: string;

	constructor(status: number, mensaje: string, codigo?: string) {
		super(mensaje);
		this.name = 'ErrorNexusBack';
		this.status = status;
		this.codigo = codigo;
	}
}

/** A qué nexus_back apunta este Monitor, para decírselo a quien opera: crear una cuenta en el ambiente equivocado no se nota. */
export function destinoDeNexusBack(): string | null {
	return API_URL ? API_URL.replace(/\/$/, '') : null;
}

async function llamar<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
	if (!API_URL) throw new Error('Falta NEXUS_API_URL: apunta al nexus_back que sirve /admins-plataforma.');
	if (!API_KEY) throw new Error('Falta NEXUS_API_KEY: es la misma llave de servicio del front.');

	const r = await fetch(`${API_URL.replace(/\/$/, '')}${ruta}`, {
		method: metodo,
		headers: { 'X-API-Key': API_KEY, ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }) },
		body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
		signal: AbortSignal.timeout(30_000)
	});
	const texto = await r.text();
	let json: unknown = null;
	try {
		json = texto ? JSON.parse(texto) : null;
	} catch {
		// no era JSON: se queda en `null` y se informa por el código
	}

	if (!r.ok) {
		const detalle = (json as { detail?: unknown } | null)?.detail;
		if (typeof detalle === 'string') throw new ErrorNexusBack(r.status, detalle);
		if (detalle && typeof detalle === 'object' && !Array.isArray(detalle)) {
			const d = detalle as { mensaje?: unknown; codigo?: unknown };
			throw new ErrorNexusBack(
				r.status,
				typeof d.mensaje === 'string' ? d.mensaje : `nexus_back ${r.status}`,
				typeof d.codigo === 'string' ? d.codigo : undefined
			);
		}
		// FastAPI responde una LISTA de errores de campo cuando faltan datos o no tienen la forma.
		if (Array.isArray(detalle)) throw new ErrorNexusBack(r.status, 'Revisa los datos: faltan o no son válidos.');
		throw new ErrorNexusBack(r.status, `nexus_back ${r.status}`);
	}
	return json as T;
}

export const listarAdmins = () => llamar<{ total: number; administradores: AdminPlataforma[] }>('GET', '/admins-plataforma/');

export const crearAdmin = (datos: { email: string; nombre: string; apellidos: string; enviarCorreo: boolean }) =>
	llamar<AccesoNuevo>('POST', '/admins-plataforma/', datos);

export const reenviarInvitacion = (guid: string) =>
	llamar<AccesoNuevo>('POST', `/admins-plataforma/${encodeURIComponent(guid)}/reenviar-invitacion`);

export const retirarAdmin = (guid: string, motivo: string) =>
	llamar<{ retirado: boolean; email: string }>('DELETE', `/admins-plataforma/${encodeURIComponent(guid)}?motivo=${encodeURIComponent(motivo)}`);
