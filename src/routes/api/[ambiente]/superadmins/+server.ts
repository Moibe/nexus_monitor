import { json, error } from '@sveltejs/kit';
import { crearAdmin, destinoDeNexusBack, listarAdmins } from '$lib/server/nexusBack';
import { ambienteDeParams } from '$lib/server/ambientes';
import { describirErrorSuperadmins } from '$lib/server/errores';
import type { RequestHandler } from './$types';

// Los administradores de plataforma que existen EN ESE AMBIENTE. Se le pregunta a nexus_back (`GET /admins-plataforma/`);
// `destino` es a cuál, para que quien opera sepa en qué ambiente está parado antes de crear una cuenta.
export const GET: RequestHandler = async ({ params }) => {
	const ambiente = ambienteDeParams(params.ambiente);
	try {
		const { total, administradores } = await listarAdmins(ambiente);
		return json({ total, administradores, destino: destinoDeNexusBack(ambiente) });
	} catch (e) {
		console.error('[superadmins]', ambiente, e);
		const { status, message } = describirErrorSuperadmins(e);
		throw error(status, message);
	}
};

// Crea uno. La respuesta trae la contraseña temporal —se muestra una vez y no se vuelve a ver—: no se escribe en ningún log.
export const POST: RequestHandler = async ({ params, request }) => {
	const ambiente = ambienteDeParams(params.ambiente);
	const cuerpo = await request.json().catch(() => null);
	const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
	const email = texto(cuerpo?.email);
	const nombre = texto(cuerpo?.nombre);
	const apellidos = texto(cuerpo?.apellidos);
	if (!email || !nombre || !apellidos) throw error(400, 'El correo, el nombre y los apellidos son obligatorios.');

	try {
		const acceso = await crearAdmin(ambiente, {
			email,
			nombre,
			apellidos,
			enviarCorreo: cuerpo?.enviarCorreo !== false
		});
		return json(acceso, { status: 201 });
	} catch (e) {
		console.error('[superadmins]', ambiente, e instanceof Error ? e.message : e);
		const { status, message } = describirErrorSuperadmins(e);
		throw error(status, message);
	}
};
