import { redirect } from '@sveltejs/kit';
import { AMBIENTE_POR_DEFECTO } from '$lib/ambientes';
import type { PageLoad } from './$types';

// La raíz manda al ambiente de entrada. Es `dev` y nunca prod: si alguien
// llega a Monitor sin decir a cuál va, que caiga donde equivocarse es gratis.
// La sección de entrada es Datos (Moibe, 2026-11-20: «datos será mi default
// al entrar a la página»).
export const load: PageLoad = () => {
	redirect(307, `/${AMBIENTE_POR_DEFECTO}/datos`);
};
