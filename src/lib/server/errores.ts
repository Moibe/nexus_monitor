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
	if (e instanceof Error && e.message.startsWith('Cloud Monitoring 403'))
		return 'La credencial no tiene permiso de Monitoring sobre este proyecto.';
	if (e instanceof Error && e.message.startsWith('Cloud Monitoring 4'))
		return 'Cloud Monitoring rechazó la petición de uso.';
	return 'No se pudo completar la operación contra Document AI o Cloud Monitoring.';
}
