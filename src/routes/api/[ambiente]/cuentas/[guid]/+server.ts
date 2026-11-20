import { json, error } from '@sveltejs/kit';
import { ErrorNexusBack, retirarCuenta, verCuenta } from '$lib/server/nexusBack';
import { ambienteDeParams } from '$lib/server/ambientes';
import { describirErrorSuperadmins } from '$lib/server/errores';
import type { RequestHandler } from './$types';

// Las cuentas de ORGANIZACIÓN que aparecen bajo cada superadmin (Moibe, 2026-11-20). GET dice, antes de retirarla, de qué
// organizaciones es el único administrador activo; DELETE la retira (borrado lógico, como a un superadmin). Si alguna organización se
// quedaría sin administrador, nexus_back solo la retira con `dejarSinAdmin`, que el navegador manda después de enseñar la advertencia.

function fallo(ambiente: string, e: unknown): never {
	console.error('[cuentas]', ambiente, e instanceof Error ? e.message : e);
	if (e instanceof ErrorNexusBack && e.status === 404 && e.message === 'Not Found') {
		throw error(502, 'El nexus_back de este ambiente todavía no sabe retirar cuentas de organización: le falta la versión nueva.');
	}
	const { status, message } = describirErrorSuperadmins(e);
	throw error(status, message);
}

export const GET: RequestHandler = async ({ params }) => {
	const ambiente = ambienteDeParams(params.ambiente);
	try {
		return json(await verCuenta(ambiente, params.guid));
	} catch (e) {
		fallo(ambiente, e);
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const ambiente = ambienteDeParams(params.ambiente);
	const cuerpo = await request.json().catch(() => null);
	const motivo = typeof cuerpo?.motivo === 'string' ? cuerpo.motivo.trim() : '';
	if (!motivo) throw error(400, 'El motivo es obligatorio: queda en la bitácora.');
	try {
		return json(await retirarCuenta(ambiente, params.guid, motivo, cuerpo?.dejarSinAdmin === true));
	} catch (e) {
		fallo(ambiente, e);
	}
};
