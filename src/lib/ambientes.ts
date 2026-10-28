// Los tres ambientes de Nexus. Este módulo es UNIVERSAL: solo el catálogo, sin
// una sola credencial (esas viven en `lib/server/ambientes.ts`).
//
// El ambiente viaja en la URL (`/prod/tablas`) y no en una cookie a propósito:
// así queda siempre a la vista, un link compartido significa siempre lo mismo,
// y una pestaña vieja no puede actuar sobre el ambiente equivocado sin que se
// note. En una app que borra procesadores y retira superadmins, eso importa
// más que ahorrarse un segmento de ruta.

export type Ambiente = 'dev' | 'staging' | 'prod';

export type DefinicionAmbiente = {
	id: Ambiente;
	etiqueta: string;
	/** Lo que el propio back reporta en su `/health`. Sirve para delatar una
	 *  configuración cruzada: si la pestaña "Dev" habla con un back que se
	 *  declara "produccion", hay que gritarlo, no esconderlo. */
	declaraSer: string;
	/** Base de SQL Server que le toca, solo para enseñarla. */
	base: string;
};

export const AMBIENTES: DefinicionAmbiente[] = [
	{ id: 'dev', etiqueta: 'Dev', declaraSer: 'dev', base: 'IA_Nexus_Dev' },
	{ id: 'staging', etiqueta: 'Staging', declaraSer: 'staging', base: 'IA_Nexus_Staging' },
	{ id: 'prod', etiqueta: 'Producción', declaraSer: 'produccion', base: 'IA_Nexus' }
];

/** El de entrada. NUNCA prod: si alguien llega a Monitor sin decir a cuál va,
 *  que caiga en el ambiente donde equivocarse no cuesta nada. */
export const AMBIENTE_POR_DEFECTO: Ambiente = 'dev';

const IDS = new Set<string>(AMBIENTES.map((a) => a.id));

export function esAmbiente(valor: string | undefined): valor is Ambiente {
	return valor !== undefined && IDS.has(valor);
}

export function definicionDe(ambiente: Ambiente): DefinicionAmbiente {
	// El `!` es seguro: `ambiente` ya pasó por `esAmbiente`.
	return AMBIENTES.find((a) => a.id === ambiente)!;
}
