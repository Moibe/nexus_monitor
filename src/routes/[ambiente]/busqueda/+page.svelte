<script lang="ts">
	// «Búsqueda» (NEX-609, 2026-11-23): las preguntas en lenguaje natural de cada organización de este ambiente. Cuántas, cuántas se
	// respondieron, cuántas fallaron, cuántas frenó el tope, cuántas reusaron una consulta, cuánto tardan y cuánto cuestan (estimado con los
	// precios de lista del back). Solo números: el texto de las preguntas no sale de nexus_back, así que no hay nada que enmascarar.
	import { page } from '$app/state';
	import { formatFecha } from '$lib/procesadores';
	import { ETIQUETA_RESULTADO, PERIODOS, dolares, duracion, entero, porcentaje } from '$lib/busqueda';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const p = $derived(data.panorama);
	const t = $derived(p?.totales);
	const desglose = $derived(
		p ? Object.entries(p.porResultado).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]) : []
	);
	const base = $derived(page.url.pathname);
</script>

<div class="busqueda">
	<header class="cabecera">
		<h1>Búsqueda</h1>
		{#if t}
			<span class="total">{entero(t.preguntas)} preguntas</span>
		{/if}
	</header>
	<p class="nota">
		Las preguntas en lenguaje natural de cada organización de este ambiente: cuántas, cuántas se respondieron, cuántas fallaron, cuánto tardan y
		cuánto cuestan. Solo números: el texto de las preguntas no sale del back.
	</p>

	<nav class="pestanas" aria-label="Periodo">
		{#each PERIODOS as d (d)}
			<a href="{base}?dias={d}" class:activa={data.dias === d} aria-current={data.dias === d ? 'page' : undefined} data-testid="periodo-{d}">
				Últimos {d} días
			</a>
		{/each}
	</nav>

	{#if data.error}
		<p class="error" data-testid="error-busqueda">{data.error}</p>
	{:else if p && t}
		<div class="kpis">
			<div class="kpi">
				<span class="kpi-etq">Preguntas</span>
				<strong data-testid="kpi-preguntas">{entero(t.preguntas)}</strong>
				<span class="kpi-sub">{porcentaje(t.respondidas, t.preguntas)} respondidas · {entero(t.reusadas)} con una consulta ya hecha</span>
			</div>
			<div class="kpi">
				<span class="kpi-etq">Fallidas</span>
				<strong class:baja={t.fallidas > 0} data-testid="kpi-fallidas">{entero(t.fallidas)}</strong>
				<span class="kpi-sub">{entero(t.noSePuede)} no se podían responder con los datos · {entero(t.topadas)} frenadas por el tope</span>
			</div>
			<div class="kpi">
				<span class="kpi-etq">Tiempo promedio</span>
				<strong data-testid="kpi-tiempo">{duracion(t.msPromedio)}</strong>
				<span class="kpi-sub">de la pregunta a la tabla</span>
			</div>
			<div class="kpi">
				<span class="kpi-etq">Costo estimado</span>
				<strong data-testid="kpi-costo">{dolares(t.costoUsd)}</strong>
				<span class="kpi-sub">{entero(t.tokensEntrada)} tokens de entrada · {entero(t.tokensSalida)} de salida</span>
			</div>
		</div>

		<div class="listado">
			{#if p.organizaciones.length === 0}
				<p class="vacio" data-testid="sin-preguntas">Nadie ha preguntado nada en los últimos {data.dias} días.</p>
			{:else}
				<div class="tabla-wrap">
					<table class="tabla" data-testid="tabla-busqueda">
						<thead>
							<tr>
								<th>Organización</th>
								<th class="num">Preguntas</th>
								<th class="num">Respondidas</th>
								<th class="num">No se podía</th>
								<th class="num">Fallidas</th>
								<th class="num">Tope</th>
								<th class="num">Reusadas</th>
								<th class="num">¿Sirvió? sí / no</th>
								<th class="num">Personas</th>
								<th class="num">Tiempo</th>
								<th class="num">Costo</th>
								<th class="num">Ejemplos</th>
								<th>Última</th>
							</tr>
						</thead>
						<tbody>
							{#each p.organizaciones as o (o.guid)}
								<tr data-testid="org-busqueda" data-guid={o.guid}>
									<td>
										<span class="org">{o.nombre ?? 'Sin nombre'}</span>
										<span class="sub mono">{o.guid}</span>
									</td>
									<td class="num">{entero(o.preguntas)}</td>
									<td class="num">{entero(o.respondidas)} <span class="sub">{porcentaje(o.respondidas, o.preguntas)}</span></td>
									<td class="num">{entero(o.noSePuede)}</td>
									<td class="num" class:mal={o.fallidas > 0}>{entero(o.fallidas)}</td>
									<td class="num" class:aviso={o.topadas > 0}>{entero(o.topadas)}</td>
									<td class="num">{entero(o.reusadas)}</td>
									<td class="num">{entero(o.utiles)} / {entero(o.noUtiles)}</td>
									<td class="num">{entero(o.personas)}</td>
									<td class="num">{duracion(o.msPromedio)}</td>
									<td class="num">{dolares(o.costoUsd)}</td>
									<td class="num">{entero(o.ejemplos)}</td>
									<td class="fecha">{o.ultimaEn ? formatFecha(o.ultimaEn) : '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		{#if desglose.length > 0}
			<div class="desglose" data-testid="desglose">
				{#each desglose as [resultado, n] (resultado)}
					<span class="chip">{ETIQUETA_RESULTADO[resultado] ?? resultado}: <strong>{entero(n)}</strong></span>
				{/each}
			</div>
		{/if}

		<p class="nota pie" data-testid="precios">
			El costo es una estimación con los precios de lista que tiene el back: {p.precios.modelo}, US${p.precios.entradaUsdMillon} por millón de tokens
			de entrada y US${p.precios.salidaUsdMillon} de salida; {p.precios.embeddings}, US${p.precios.embeddingsUsdMillon}. Topes: {entero(p.topes.personaPorHora)}
			preguntas por persona por hora y {entero(p.topes.organizacionPorDia)} por organización por día.
		</p>
	{/if}
</div>

<style>
	.busqueda {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.cabecera {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.cabecera h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 2rem;
	}

	.total {
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: var(--radius-sm);
		padding: 0.125rem 0.5rem;
		color: var(--muted-foreground);
		background: var(--muted);
	}

	.cabecera + .nota {
		margin-top: -1.125rem;
	}

	.nota {
		margin: 0;
		max-width: 80ch;
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	.nota.pie {
		font-size: 0.75rem;
	}

	.error {
		margin: 0;
		font-size: 0.875rem;
		color: var(--aviso-error-texto);
		background: var(--aviso-error-fondo);
		border: 1px solid var(--aviso-error-borde);
		border-radius: var(--radius-lg);
		padding: 0.75rem 1rem;
	}

	.vacio {
		margin: 0;
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	.pestanas {
		display: inline-flex;
		align-self: flex-start;
		gap: 0.25rem;
		padding: 0.25rem;
		background: var(--muted);
		border-radius: var(--radius-lg);
	}

	.pestanas a {
		display: inline-flex;
		align-items: center;
		height: 1.85rem;
		padding: 0 0.85rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--muted-foreground);
		text-decoration: none;
		border-radius: var(--radius-md);
	}

	.pestanas a.activa {
		color: var(--foreground);
		background: var(--card);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
	}

	.kpis {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1rem;
	}

	.kpi {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem 1.25rem;
		background: var(--card);
		border: 2px solid var(--border);
		border-radius: var(--radius-2xl);
	}

	.kpi-etq {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.kpi strong {
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.2;
	}

	.kpi strong.baja {
		color: var(--destructive);
	}

	.kpi-sub {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.listado {
		background: var(--card);
		border: 2px solid var(--border);
		border-radius: var(--radius-2xl);
		padding: 1.25rem;
	}

	.tabla-wrap {
		overflow-x: auto;
	}

	.tabla {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}

	.tabla thead th {
		text-align: left;
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--muted-foreground);
		padding: 0.625rem 1rem 0.625rem 0.5rem;
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
		white-space: nowrap;
	}

	.tabla td {
		padding: 0.7rem 1rem 0.7rem 0.5rem;
		border-bottom: 1px solid var(--border);
		vertical-align: top;
	}

	.tabla tbody tr:last-child td {
		border-bottom: none;
	}

	.tabla .num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.tabla td.mal {
		color: var(--destructive);
		font-weight: 600;
	}

	.tabla td.aviso {
		color: var(--warning);
		font-weight: 600;
	}

	.org {
		display: block;
		font-weight: 500;
	}

	.sub {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.mono {
		display: block;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.6875rem;
	}

	.fecha {
		white-space: nowrap;
		color: var(--muted-foreground);
	}

	.desglose {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		background: var(--muted);
		border-radius: var(--radius-md);
		padding: 0.25rem 0.6rem;
	}

	.chip strong {
		color: var(--foreground);
		font-weight: 600;
	}

	@media (max-width: 900px) {
		.kpis {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
