// «Búsqueda» (NEX-609, 2026-11-23): las preguntas en lenguaje natural de cada organización de un ambiente. Solo NÚMEROS: el texto de las
// preguntas no sale de nexus_back (puede traer datos de personas). Este módulo es universal: tipos y formatos, sin credenciales.

export type OrgBusqueda = {
	guid: string;
	nombre: string | null;
	preguntas: number;
	respondidas: number;
	/** El modelo dijo que esos datos no responden la pregunta: no es una falla del sistema. */
	noSePuede: number;
	/** Sin consulta segura, tardó, el modelo o la conexión no disponibles, u otro error. */
	fallidas: number;
	/** Las frenó el tope de uso (no llegaron al modelo). */
	topadas: number;
	/** Respondidas con la consulta de un ejemplo aprobado o de una pregunta igual anterior (sin llamar al modelo). */
	reusadas: number;
	utiles: number;
	noUtiles: number;
	personas: number;
	msPromedio: number | null;
	tokensEntrada: number;
	tokensSalida: number;
	costoUsd: number;
	ultimaEn: string | null;
	ejemplos: number;
};

export type PanoramaBusqueda = {
	dias: number;
	organizaciones: OrgBusqueda[];
	totales: {
		preguntas: number;
		respondidas: number;
		noSePuede: number;
		fallidas: number;
		topadas: number;
		reusadas: number;
		utiles: number;
		noUtiles: number;
		tokensEntrada: number;
		tokensSalida: number;
		costoUsd: number;
		msPromedio: number | null;
	};
	porResultado: Record<string, number>;
	topes: { personaPorHora: number; organizacionPorDia: number };
	precios: { modelo: string; entradaUsdMillon: number; salidaUsdMillon: number; embeddings: string; embeddingsUsdMillon: number };
};

/** Los periodos que se ofrecen. */
export const PERIODOS = [7, 30, 90] as const;

/** El periodo pedido en la dirección (`?dias=`), o 30. */
export function diasDe(valor: string | null): number {
	const n = Number.parseInt(valor ?? '', 10);
	return (PERIODOS as readonly number[]).includes(n) ? n : 30;
}

const ENTERO = new Intl.NumberFormat('es-MX');

export const entero = (n: number) => ENTERO.format(n);

/** Dólares: con 2 decimales desde un centavo; por debajo, con 4 (una pregunta cuesta décimas de centavo); lo que ni a eso llega, «< US$0.0001». */
export function dolares(n: number): string {
	if (!Number.isFinite(n) || n <= 0) return 'US$0';
	if (n < 0.0001) return '< US$0.0001';
	return `US$${n >= 0.01 ? n.toFixed(2) : n.toFixed(4)}`;
}

/** «1.8 s» o «420 ms». */
export function duracion(ms: number | null): string {
	if (ms === null || !Number.isFinite(ms)) return '—';
	return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

/** Qué parte de `de` es `parte`, en por ciento sin decimales; «—» si no hay de qué. */
export function porcentaje(parte: number, de: number): string {
	return de > 0 ? `${Math.round((parte / de) * 100)} %` : '—';
}

/** Cómo se dice cada resultado en el desglose. */
export const ETIQUETA_RESULTADO: Record<string, string> = {
	ok: 'Respondidas',
	no_se_puede: 'No se podían responder con los datos',
	consulta_invalida: 'Sin consulta segura',
	tardo: 'Tardaron demasiado',
	modelo: 'El modelo falló',
	sin_configurar: 'Sin configurar',
	tope: 'Frenadas por el tope',
	error: 'Otro error'
};
