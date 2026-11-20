import { redirect } from '@sveltejs/kit';
import { esAmbiente } from '$lib/ambientes';
import type { PageLoad } from './$types';

// `/dev` (o `/staging`, `/prod`) sin sección entra a Datos, la sección de
// entrada, igual que la raíz. Un ambiente que no existe no se redirige: su
// 404 lo da el layout.
export const load: PageLoad = ({ params }) => {
	if (esAmbiente(params.ambiente)) redirect(307, `/${params.ambiente}/datos`);
};
