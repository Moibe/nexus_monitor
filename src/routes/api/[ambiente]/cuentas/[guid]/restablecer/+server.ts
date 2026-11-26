import { json } from '@sveltejs/kit';
import { ambienteDeParams } from '$lib/server/ambientes';
import { restablecer } from '$lib/server/restablecer';
import type { RequestHandler } from './$types';

// Lo mismo que para un superadmin, para una cuenta de organización (las de abajo de cada superadmin).
export const POST: RequestHandler = async ({ params }) =>
	json(await restablecer(ambienteDeParams(params.ambiente), params.guid, true));
