import { ErrorNexusBack } from '$lib/server/nexusBack';

/**
 * Lo mismo para la sección de Superadmins, que le habla a nexus_back. Un rechazo de nexus_back que ya trae su texto en español
 * (un correo repetido, el último administrador que no se puede retirar) pasa tal cual con su código; lo demás —la llave, la red,
 * una ruta que ese back todavía no tiene— se traduce a lo que quien opera tiene que hacer.
 */
export function describirErrorSuperadmins(e: unknown): { status: number; message: string } {
	if (e instanceof ErrorNexusBack) {
		if (e.status === 401) return { status: 502, message: 'nexus_back rechazó la llave (NEXUS_API_KEY no coincide con la suya).' };
		if (e.status === 404 && e.message === 'Not Found') {
			return { status: 502, message: 'Ese nexus_back no tiene /admins-plataforma: hoy solo existe en su rama dev (8084).' };
		}
		if (e.status >= 500) return { status: 502, message: 'nexus_back no pudo completar la operación (revisa su log).' };
		return { status: e.status, message: e.message };
	}
	if (e instanceof DOMException && e.name === 'TimeoutError') return { status: 504, message: 'nexus_back no respondió en 30 s.' };
	if (e instanceof TypeError && e.message === 'fetch failed') {
		const causa = (e as { cause?: { code?: string } }).cause;
		return { status: 502, message: `No se pudo alcanzar nexus_back (${causa?.code ?? 'red'}).` };
	}
	if (e instanceof Error && e.message.startsWith('Falta NEXUS_API_')) return { status: 500, message: e.message };
	return { status: 502, message: 'No se pudo completar la operación contra nexus_back.' };
}

/**
 * Traduce la excepción a algo que se pueda enseñar. Con `fetch` nativo, un
 * fallo de red da `TypeError: fetch failed` y punto: la causa real (ENOTFOUND,
 * ERR_TLS_CERT_ALTNAME_INVALID) solo vive en `e.cause.code`.
 */
export function describirError(e: unknown): string {
	if (e instanceof DOMException && e.name === 'TimeoutError')
		return 'Document AI no respondió en 30 s.';
	if (e instanceof TypeError && e.message === 'fetch failed') {
		const causa = (e as { cause?: { code?: string } }).cause;
		return `No se pudo alcanzar Document AI (${causa?.code ?? 'red'}).`;
	}
	// Dos redacciones distintas para dos fallas distintas, y las dos son las
	// más probables en producción. Si solo atrapas la primera, la segunda
	// —que es la típica ruta mal escrita en el arranque de pm2— cae al
	// mensaje genérico y no diagnostica nada. Medido con las dos.
	if (e instanceof Error && e.message.includes('Could not load the default credentials'))
		return 'Falta GOOGLE_APPLICATION_CREDENTIALS en el server.';
	if (e instanceof Error && e.message.includes('Unable to read the credential file'))
		return 'GOOGLE_APPLICATION_CREDENTIALS apunta a un archivo que no se puede leer.';
	if (e instanceof Error && e.message.startsWith('Falta DOCAI_PROJECT_ID'))
		return e.message;
	if (e instanceof Error && e.message.startsWith('Document AI 403'))
		return 'La credencial no tiene permiso sobre este proyecto de Document AI.';
	// Estas dos son específicas de borrar, y tienen que ir ANTES del catch-all
	// 'Document AI 4' de abajo (404 y 409 también empiezan con 'Document AI 4').
	if (e instanceof Error && e.message.startsWith('Document AI 404'))
		return 'Ese procesador ya no existe (puede que alguien más ya lo haya borrado).';
	if (e instanceof Error && e.message.startsWith('Document AI 409'))
		return 'El procesador está en medio de otra operación; intenta de nuevo en un momento.';
	if (e instanceof Error && e.message.startsWith('Document AI 4'))
		return 'Document AI rechazó la petición. Revisa el proyecto y la location.';
	if (e instanceof Error && e.message.startsWith('Falta NEXUS_API_'))
		return e.message;
	if (e instanceof Error && e.message.startsWith('nexus_back 401'))
		return 'nexus_back rechazó la llave (NEXUS_API_KEY no coincide con la suya).';
	if (e instanceof Error && e.message.startsWith('nexus_back 404'))
		return 'Ese nexus_back no tiene /esquema/tablas: hoy solo existe en su rama dev (8084).';
	if (e instanceof Error && e.message.startsWith('nexus_back 503'))
		return 'nexus_back no pudo leer el catálogo de SQL Server.';
	if (e instanceof Error && e.message.startsWith('nexus_back '))
		return 'nexus_back no respondió bien al pedirle el inventario de tablas.';
	if (e instanceof Error && e.message.startsWith('Cloud Monitoring 403'))
		return 'La credencial no tiene permiso de Monitoring sobre este proyecto.';
	if (e instanceof Error && e.message.startsWith('Cloud Monitoring 4'))
		return 'Cloud Monitoring rechazó la petición de uso.';
	return 'No se pudo completar la operación contra Document AI o Cloud Monitoring.';
}
