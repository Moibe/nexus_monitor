import type { AdminPlataforma } from '$lib/server/nexusBack';
import type { PageLoad } from './$types';

// Pega contra nuestra propia ruta, que a su vez le pregunta a nexus_back. Si eso falla (llave, back caído, un back que todavía no tiene
// `/admins-plataforma`), la página no se cae: enseña el motivo y deja el formulario fuera de uso hasta que haya con quién hablar.
export const load: PageLoad = async ({ fetch, params }) => {
	const r = await fetch(`/api/${params.ambiente}/superadmins`);

	if (!r.ok) {
		const cuerpo = await r.json().catch(() => null);
		return {
			error: (cuerpo?.message as string | undefined) ?? `Error ${r.status} al cargar los superadmins.`,
			administradores: [] as AdminPlataforma[],
			destino: null as string | null
		};
	}

	const { administradores, destino } = await r.json();
	return { error: null as string | null, administradores: administradores as AdminPlataforma[], destino: destino as string | null };
};
