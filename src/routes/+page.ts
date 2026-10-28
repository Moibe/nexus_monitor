import { redirect } from '@sveltejs/kit';
import { AMBIENTE_POR_DEFECTO } from '$lib/ambientes';
import type { PageLoad } from './$types';

// La raíz manda al ambiente de entrada. Es `dev` y nunca prod: si alguien
// llega a Monitor sin decir a cuál va, que caiga donde equivocarse es gratis.
export const load: PageLoad = () => {
	redirect(307, `/${AMBIENTE_POR_DEFECTO}/procesadores`);
};
