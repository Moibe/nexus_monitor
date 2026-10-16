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
