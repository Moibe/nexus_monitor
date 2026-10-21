import { json, error } from '@sveltejs/kit';
import { reenviarInvitacion } from '$lib/server/nexusBack';
import { describirErrorSuperadmins } from '$lib/server/errores';
import type { RequestHandler } from './$types';

// Le regenera la contraseña temporal a quien todavía no hace su primer acceso (la anterior deja de servir). Quien ya entró tiene
// «Olvidé mi contraseña»: nexus_back lo rechaza con su texto y pasa tal cual. La contraseña nueva viaja en la respuesta y no se escribe en ningún log.
export const POST: RequestHandler = async ({ params }) => {
	try {
		return json(await reenviarInvitacion(params.guid));
	} catch (e) {
		console.error('[superadmins]', e instanceof Error ? e.message : e);
		const { status, message } = describirErrorSuperadmins(e);
		throw error(status, message);
	}
};
