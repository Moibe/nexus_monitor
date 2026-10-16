import type { PageLoad } from './$types';

export type TablaViva = { esquema: string; tabla: string; filas: number };

// Pega contra nuestra propia ruta, que a su vez le pregunta a nexus_back. Si
// eso falla (llave, back caído, endpoint todavía no promovido a prod), la
// página no se cae: cae a la foto estática que ya traía, avisando.
export const load: PageLoad = async ({ fetch }) => {
	const r = await fetch('/api/tablas');

	if (!r.ok) {
		const cuerpo = await r.json().catch(() => null);
		return {
			vivas: null as TablaViva[] | null,
			errorVivas:
				(cuerpo?.message as string | undefined) ?? `Error ${r.status} al leer el inventario.`
		};
	}

	const { tablas } = await r.json();
	return { vivas: tablas as TablaViva[], errorVivas: null as string | null };
};
