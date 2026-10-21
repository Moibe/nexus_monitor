import { json, error } from '@sveltejs/kit';
import { retirarAdmin } from '$lib/server/nexusBack';
import { describirErrorSuperadmins } from '$lib/server/errores';
import type { RequestHandler } from './$types';

// Retira a un administrador de plataforma (borrado lógico: su correo queda libre y el rastro se queda en la bitácora de nexus_back).
// El motivo es obligatorio. nexus_back se niega a retirar al último administrador activo; su razón pasa tal cual.
export const DELETE: RequestHandler = async ({ params, request }) => {
	const cuerpo = await request.json().catch(() => null);
	const motivo = typeof cuerpo?.motivo === 'string' ? cuerpo.motivo.trim() : '';
	if (!motivo) throw error(400, 'El motivo es obligatorio: queda en la bitácora.');

	try {
		return json(await retirarAdmin(params.guid, motivo));
	} catch (e) {
		console.error('[superadmins]', e instanceof Error ? e.message : e);
		const { status, message } = describirErrorSuperadmins(e);
		throw error(status, message);
	}
};
