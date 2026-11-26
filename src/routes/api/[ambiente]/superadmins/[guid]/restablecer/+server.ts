import { json } from '@sveltejs/kit';
import { ambienteDeParams } from '$lib/server/ambientes';
import { restablecer } from '$lib/server/restablecer';
import type { RequestHandler } from './$types';

// Le pone una contraseña temporal nueva a un superadmin que olvidó la suya, aunque ya haya hecho su primer acceso (la de antes no se
// puede ver: es un hash). Vuelve a su primer acceso y se le cierran las sesiones.
export const POST: RequestHandler = async ({ params }) =>
	json(await restablecer(ambienteDeParams(params.ambiente), params.guid, false));
