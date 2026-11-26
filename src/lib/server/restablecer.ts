import { error } from '@sveltejs/kit';
import { ErrorNexusBack, restablecerContrasena } from '$lib/server/nexusBack';
import type { Ambiente } from '$lib/ambientes';
import { describirErrorSuperadmins } from '$lib/server/errores';

/**
 * Restablece la contraseña de un superadmin (`cuenta = false`) o de una cuenta de organización, para las dos rutas `…/restablecer`.
 * La temporal viaja en la respuesta y no se escribe en ningún log.
 */
export async function restablecer(ambiente: Ambiente, guid: string, cuenta: boolean) {
	try {
		return await restablecerContrasena(ambiente, guid, cuenta);
	} catch (e) {
		console.error('[restablecer]', ambiente, e instanceof Error ? e.message : e);
		if (e instanceof ErrorNexusBack && e.status === 404 && e.message === 'Not Found') {
			throw error(502, 'El nexus_back de este ambiente todavía no sabe restablecer contraseñas: le falta la versión nueva.');
		}
		const { status, message } = describirErrorSuperadmins(e);
		throw error(status, message);
	}
}
