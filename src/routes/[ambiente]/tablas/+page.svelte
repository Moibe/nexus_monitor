<script lang="ts">
	import {
		ESQUEMAS,
		CONVENCIONES,
		LEIDO_EL,
		descripcionDe,
		type EstadoTabla
	} from '$lib/tablasSql';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const ETIQUETA_ESTADO: Record<EstadoTabla, string> = {
		'con-datos': 'con datos',
		vacia: 'vacía',
		'no-existe': 'no existe aún'
	};

	// Agrupa lo que llegó en vivo por esquema, poniéndole a cada tabla la
	// descripción curada cuando la hay. Las que no la tengan salen igual: que
	// aparezca una tabla que no conocíamos es justo lo que esto debe delatar.
	let gruposVivos = $derived.by(() => {
		if (!data.vivas) return null;
		const porEsquema = new Map<string, { tabla: string; filas: number }[]>();
		for (const t of data.vivas) {
			const lista = porEsquema.get(t.esquema);
			if (lista) lista.push({ tabla: t.tabla, filas: t.filas });
			else porEsquema.set(t.esquema, [{ tabla: t.tabla, filas: t.filas }]);
		}
		return [...porEsquema.entries()]
			.map(([esquema, tablas]) => ({
				esquema,
				tablas: [...tablas].sort((a, b) => a.tabla.localeCompare(b.tabla, 'es'))
			}))
			.sort((a, b) => a.esquema.localeCompare(b.esquema, 'es'));
	});

	// Las que seguimos esperando del DBA: curadas como "no existe aún" y que
	// efectivamente no aparecieron en la lectura en vivo.
	let pendientes = $derived.by(() => {
		if (!data.vivas) return [];
		const existen = new Set(data.vivas.map((t) => t.tabla.toLowerCase()));
		return ESQUEMAS.flatMap((e) => e.tablas)
			.filter((t) => t.estado === 'no-existe' && !existen.has(t.nombre.toLowerCase()));
	});

	const totalVivas = $derived(data.vivas?.length ?? 0);
</script>

<div class="tablas">
	<header class="cabecera">
		<h1>Tablas en SQL</h1>
		{#if data.vivas}
			<span class="total">{totalVivas} tablas</span>
			<span class="en-vivo">en vivo</span>
		{/if}
	</header>

	{#if data.vivas}
		<p class="nota">
			Leído de la base ahora mismo (<code>IA_Nexus</code>), vía nexus_back: Monitor no se conecta
			a SQL Server, le pregunta al back, que es quien tiene las credenciales. Solo metadatos —
			nombres y conteos — nunca datos de un cliente. Los conteos son los del motor: exactos para
			un inventario, no para cuadrar cifras.
		</p>
	{:else}
		<p class="nota nota-error">
			No se pudo leer la base: {data.errorVivas} — abajo queda la foto del {LEIDO_EL}, que puede
			haber envejecido.
		</p>
	{/if}

	<div class="tabla-wrap">
		<table class="tabla-esquema">
			<thead>
				<tr>
					<th class="col-nombre">Tabla</th>
					<th>Para qué</th>
					<th>Columnas clave</th>
					<th class="col-num">{data.vivas ? 'Filas' : 'Estado'}</th>
				</tr>
			</thead>
			<tbody>
				{#if gruposVivos}
					{#each gruposVivos as grupo (grupo.esquema)}
						<tr class="fila-esquema">
							<th colspan="4">{grupo.esquema}</th>
						</tr>
						{#each grupo.tablas as t (grupo.esquema + t.tabla)}
							{@const info = descripcionDe(t.tabla)}
							<tr class="fila">
								<td class="col-nombre"><code>{t.tabla}</code></td>
								<td class="col-proposito">
									{#if info}
										{info.proposito}
										{#if info.nota}<span class="nota-fila">{info.nota}</span>{/if}
									{:else}
										<span class="sin-dato">sin descripción todavía</span>
									{/if}
								</td>
								<td class="col-columnas">{info?.columnas ?? '—'}</td>
								<td class="col-num">
									<span class="filas" class:cero={t.filas === 0}>{t.filas.toLocaleString('es-MX')}</span>
								</td>
							</tr>
						{/each}
					{/each}

					{#if pendientes.length}
						<tr class="fila-esquema">
							<th colspan="4">
								por definir
								<span class="esquema-desc">acordadas en el diccionario, todavía sin crear</span>
							</th>
						</tr>
						{#each pendientes as t (t.nombre)}
							<tr class="fila">
								<td class="col-nombre"><code>{t.nombre}</code></td>
								<td class="col-proposito">{t.proposito}</td>
								<td class="col-columnas">{t.columnas}</td>
								<td class="col-num"><span class="estado no-existe">no existe aún</span></td>
							</tr>
						{/each}
					{/if}
				{:else}
					{#each ESQUEMAS as esquema (esquema.nombre)}
						<tr class="fila-esquema">
							<th colspan="4">
								{esquema.nombre}
								<span class="esquema-desc">{esquema.descripcion}</span>
							</th>
						</tr>
						{#each esquema.tablas as tabla (esquema.nombre + tabla.nombre)}
							<tr class="fila">
								<td class="col-nombre"><code>{tabla.nombre}</code></td>
								<td class="col-proposito">
									{tabla.proposito}
									{#if tabla.nota}<span class="nota-fila">{tabla.nota}</span>{/if}
								</td>
								<td class="col-columnas">{tabla.columnas}</td>
								<td class="col-num">
									<span class="estado {tabla.estado}">{ETIQUETA_ESTADO[tabla.estado]}</span>
								</td>
							</tr>
						{/each}
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<section class="convenciones">
		<h2>Convenciones del DBA</h2>
		<ul>
			{#each CONVENCIONES as convencion}
				<li>{convencion}</li>
			{/each}
		</ul>
	</section>
</div>

<style>
	/* Una columna con aire parejo entre sus bloques (ver procesadores). */
	.tablas {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.cabecera {
		display: flex;
		align-items: center;
		gap: 0.5rem;
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
		color: var(--muted-foreground);
		background: var(--muted);
		border-radius: var(--radius-sm);
		padding: 0.125rem 0.5rem;
	}

	.en-vivo {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--success);
		background: var(--success-soft);
		border-radius: var(--radius-sm);
		padding: 0.125rem 0.5rem;
	}

	.cabecera + .nota {
		margin-top: -1.125rem;
	}

	.nota {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		margin: 0;
		max-width: 76ch;
		line-height: 1.55;
	}

	.nota code {
		font-family: var(--font-mono);
		font-size: 0.8rem;
	}

	.nota-error {
		color: var(--aviso-atencion-texto);
	}

	/* La tarjeta del listado: la de «Listado de usuarios» de Biblioratum. */
	.tabla-wrap {
		overflow-x: auto;
		background: var(--card);
		border: 2px solid var(--border);
		border-radius: var(--radius-2xl);
		padding: 1.25rem;
	}

	.tabla-esquema {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.tabla-esquema thead th {
		text-align: left;
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--muted-foreground);
		padding: 0.625rem 1rem 0.625rem 0.5rem;
		white-space: nowrap;
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
	}

	.fila-esquema th {
		text-align: left;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--foreground);
		background: var(--muted-soft);
		padding: 0.55rem 0.5rem;
		border-bottom: 1px solid var(--border);
	}

	.esquema-desc {
		font-weight: 400;
		font-size: 0.75rem;
		color: var(--muted-foreground);
		margin-left: 0.5rem;
	}

	.fila td {
		padding: 0.75rem 1rem 0.75rem 0.5rem;
		border-bottom: 1px solid var(--border);
		vertical-align: top;
	}

	.fila td:last-child {
		white-space: nowrap;
	}

	.col-nombre code {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--foreground);
		white-space: nowrap;
	}

	.col-proposito {
		color: var(--foreground);
		min-width: 18ch;
	}

	.sin-dato {
		color: var(--muted-foreground);
		font-style: italic;
	}

	.nota-fila {
		display: block;
		font-size: 0.75rem;
		color: var(--muted-foreground);
		margin-top: 0.2rem;
		line-height: 1.4;
	}

	.col-columnas {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--muted-foreground);
		line-height: 1.5;
		min-width: 20ch;
	}

	.col-num {
		text-align: right;
	}

	.filas {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		color: var(--success);
	}

	.filas.cero {
		color: var(--muted-foreground);
		font-weight: 400;
	}

	/* Insignias: la de «Estatus» de Biblioratum (`rounded-md px-2 py-0.5 text-xs font-medium`). */
	.estado {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: var(--radius-sm);
		padding: 0.125rem 0.5rem;
		white-space: nowrap;
	}

	.estado.con-datos {
		color: var(--success);
		background: var(--success-soft);
	}

	.estado.vacia {
		color: var(--warning);
		background: var(--warning-soft);
	}

	.estado.no-existe {
		color: var(--muted-foreground);
		background: var(--muted);
	}

	.convenciones {
		background: var(--card);
		border: 2px solid var(--border);
		border-radius: var(--radius-2xl);
		padding: 1.25rem;
	}

	.convenciones h2 {
		font-size: 0.875rem;
		font-weight: 500;
		margin: 0 0 0.6rem;
	}

	.convenciones ul {
		margin: 0;
		padding-left: 1.1rem;
		color: var(--muted-foreground);
		font-size: 0.8125rem;
		line-height: 1.7;
	}
</style>
