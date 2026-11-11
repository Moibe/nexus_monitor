import type { Ambiente } from '$lib/ambientes';
import type { Ficha, Panorama } from '$lib/datos';

// Los datos extraídos son datos de CLIENTES (una INE trae nombre, CURP y domicilio). Hasta la sección «Datos» Monitor solo enseñaba
// metadatos; desde el 2026-11-11 enseña valores, con esta regla (decisión tomada al construirla, a juicio, por encargo de Moibe):
//
//   dev y staging: completos (son datos de prueba);
//   producción:    enmascarados AQUÍ, en el servidor de Monitor, antes de que salgan al navegador. Se ve qué campos salieron, su
//                  confianza y qué faltó, pero no el valor: `JUAN PÉREZ` llega como `J•••••••••`.
//
// Se enmascara en el servidor y no con CSS para que el valor no viaje nunca al navegador. Si un día se quiere ver prod completo,
// este es el único lugar que hay que tocar.

export const enmascaraEn = (ambiente: Ambiente) => ambiente === 'prod';

export function enmascarar(valor: string | null): string | null {
	if (valor === null || valor === undefined) return valor;
	const t = String(valor);
	if (t.length <= 2) return '••';
	return t[0] + '•'.repeat(Math.min(t.length - 1, 12));
}

/** El nombre del archivo también delata («ine juan perez.pdf»): se enmascara y se conserva la extensión. */
function enmascararArchivo(nombre: string): string {
	const punto = nombre.lastIndexOf('.');
	const ext = punto > 0 && nombre.length - punto <= 6 ? nombre.slice(punto) : '';
	return (enmascarar(ext ? nombre.slice(0, punto) : nombre) ?? '') + ext;
}

export function panoramaPara(ambiente: Ambiente, p: Panorama): Panorama {
	if (!enmascaraEn(ambiente)) return { ...p, enmascarado: false };
	return { ...p, enmascarado: true, documentos: p.documentos.map((d) => ({ ...d, archivo: enmascararArchivo(d.archivo) })) };
}

export function fichaPara(ambiente: Ambiente, f: Ficha): Ficha {
	if (!enmascaraEn(ambiente)) return { ...f, enmascarado: false };
	return {
		...f,
		enmascarado: true,
		archivo: enmascararArchivo(f.archivo),
		campos: f.campos.map((c) => ({
			...c,
			valor: enmascarar(c.valor),
			valorCrudo: enmascarar(c.valorCrudo),
			valorExtraido: enmascarar(c.valorExtraido)
		}))
	};
}
