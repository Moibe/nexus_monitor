import { configDe } from '$lib/server/ambientes';
import type { Ambiente } from '$lib/ambientes';

// Monitor NO se conecta a SQL Server: le pregunta a nexus_back, que es quien
// tiene las credenciales, el driver ODBC y la relación con el DBA. Así esas
// credenciales siguen viviendo en UN solo lugar — y no en este repo, que es
// público y además puede borrar procesadores.
//
// TODO lo de aquí recibe `ambiente` como primer parámetro, y no se queda con
// ninguna config en una constante de módulo. Esa es la diferencia que hace
// posible atender los tres ambientes desde UN proceso: la configuración se
// resuelve por petición, según a cuál le pidieron hablar.

export type TablaViva = {
	esquema: string;
	tabla: string;
	filas: number;
};

/**
 * Inventario de tablas tal como está la base de ESE ambiente AHORA. El
 * endpoint lo sirve nexus_back (`GET /esquema/tablas`, solo lectura, solo
 * metadatos). Los tres backs lo tienen (verificado 2026-10-28).
 */
export async function obtenerTablas(ambiente: Ambiente): Promise<TablaViva[]> {
	const { url, key } = configDe(ambiente);

	const r = await fetch(`${url}/esquema/tablas`, {
		headers: { 'X-API-Key': key },
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
	/** Las cuentas que dio de alta, según la bitácora del back. `undefined` en un nexus_back que todavía no lo informa. */
	creados?: CuentaCreada[];
};

export type CuentaCreada = {
	guid: string;
	/** `null` solo si se retiró y su retiro no dejó el correo. */
	email: string | null;
	nombre: string | null;
	apellidos: string | null;
	estado: EstadoAdmin | 'retirado';
	/** `ADMIN` (de una organización), `ADMIN_PLATAFORMA`, u otro rol de organización. */
	rol: string | null;
	organizacion: { guid: string; nombre: string | null } | null;
	creadoEn: string | null;
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

/** A qué nexus_back apunta un ambiente, para decírselo a quien opera: crear una cuenta en el ambiente equivocado no se nota. */
export function destinoDeNexusBack(ambiente: Ambiente): string | null {
	try {
		return configDe(ambiente).url;
	} catch {
		return null;
	}
}

async function llamar<T>(ambiente: Ambiente, metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
	const { url, key } = configDe(ambiente);

	const r = await fetch(`${url}${ruta}`, {
		method: metodo,
		headers: { 'X-API-Key': key, ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }) },
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

export const listarAdmins = (ambiente: Ambiente) =>
	llamar<{ total: number; administradores: AdminPlataforma[] }>(ambiente, 'GET', '/admins-plataforma/');

export const crearAdmin = (
	ambiente: Ambiente,
	datos: { email: string; nombre: string; apellidos: string; enviarCorreo: boolean }
) => llamar<AccesoNuevo>(ambiente, 'POST', '/admins-plataforma/', datos);

export const reenviarInvitacion = (ambiente: Ambiente, guid: string) =>
	llamar<AccesoNuevo>(ambiente, 'POST', `/admins-plataforma/${encodeURIComponent(guid)}/reenviar-invitacion`);

export const retirarAdmin = (ambiente: Ambiente, guid: string, motivo: string) =>
	llamar<{ retirado: boolean; email: string }>(
		ambiente,
		'DELETE',
		`/admins-plataforma/${encodeURIComponent(guid)}?motivo=${encodeURIComponent(motivo)}`
	);
