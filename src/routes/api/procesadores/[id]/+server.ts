import { json, error } from '@sveltejs/kit';
import { eliminarProcesador } from '$lib/server/docai';
import { describirError } from '$lib/server/errores';
import type { RequestHandler } from './$types';

// El id real de Document AI es hexadecimal, pero se valida contra un charset
// más laxo (alfanumérico) a propósito: es defensa en profundidad, no el
// parser de verdad — el id se mete directo en la URL de la API de Google, así
// que esto es lo único que evita algo tipo `../otro-recurso` antes de llegar
// ahí. `eliminarProcesador` arma el resource name completo con NUESTRO
// PROJECT/LOCATION, nunca con uno que mande el cliente.
const ID_VALIDO = /^[a-z0-9]+$/i;

export const DELETE: RequestHandler = async ({ params }) => {
	if (!ID_VALIDO.test(params.id)) {
		throw error(400, 'ID de procesador inválido.');
	}
	try {
		await eliminarProcesador(params.id);
		return json({ ok: true });
	} catch (e) {
		console.error('[procesadores/eliminar]', params.id, e);
		throw error(502, describirError(e));
	}
};
