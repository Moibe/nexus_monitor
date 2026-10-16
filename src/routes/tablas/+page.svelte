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
	.tablas {
		padding: 1.5rem 0.5rem 2.5rem;
	}

	.cabecera {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.cabecera h1 {
		font-size: 1.4rem;
		margin: 0;
	}

	.total {
		font-size: 0.85rem;
		color: #6b7280;
		background: rgba(37, 99, 235, 0.08);
		border: 1px solid rgba(37, 99, 235, 0.18);
		border-radius: 999px;
		padding: 0.15rem 0.65rem;
	}

	.en-vivo {
		font-size: 0.72rem;
		font-weight: 600;
		color: #15803d;
		background: rgba(21, 128, 61, 0.1);
		border-radius: 999px;
		padding: 0.15rem 0.55rem;
	}

	.nota {
		font-size: 0.78rem;
		color: #6b7280;
		margin: 0 0 1.5rem;
		max-width: 76ch;
		line-height: 1.5;
	}

	.nota code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}

	.nota-error {
		color: #92400e;
	}

	.tabla-wrap {
		overflow-x: auto;
	}

	.tabla-esquema {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0 0.3rem;
		font-size: 0.86rem;
	}

	.tabla-esquema thead th {
		text-align: left;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #9ca3af;
		padding: 0 0.8rem 0.5rem;
		white-space: nowrap;
	}

	.fila-esquema th {
		text-align: left;
		font-size: 0.95rem;
		font-weight: 600;
		color: #374151;
		padding: 0.9rem 0.4rem 0.4rem;
		border-bottom: 1px solid rgba(17, 24, 39, 0.08);
	}

	.fila-esquema:first-child th {
		padding-top: 0.2rem;
	}

	.esquema-desc {
		font-weight: 400;
		font-size: 0.78rem;
		color: #9ca3af;
		margin-left: 0.5rem;
	}

	.fila td {
		padding: 0.55rem 0.8rem;
		border-top: 1px solid rgba(17, 24, 39, 0.06);
		border-bottom: 1px solid rgba(17, 24, 39, 0.06);
		background: rgba(17, 24, 39, 0.015);
		vertical-align: top;
	}

	.fila td:first-child {
		border-left: 1px solid rgba(17, 24, 39, 0.06);
		border-top-left-radius: 10px;
		border-bottom-left-radius: 10px;
	}

	.fila td:last-child {
		border-right: 1px solid rgba(17, 24, 39, 0.06);
		border-top-right-radius: 10px;
		border-bottom-right-radius: 10px;
		white-space: nowrap;
	}

	.col-nombre code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.82rem;
		color: #1f2937;
		white-space: nowrap;
	}

	.col-proposito {
		color: #1f2937;
		min-width: 18ch;
	}

	.sin-dato {
		color: #9ca3af;
		font-style: italic;
	}

	.nota-fila {
		display: block;
		font-size: 0.75rem;
		color: #9ca3af;
		margin-top: 0.2rem;
		line-height: 1.4;
	}

	.col-columnas {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.75rem;
		color: #6b7280;
		line-height: 1.5;
		min-width: 20ch;
	}

	.col-num {
		text-align: right;
	}

	.filas {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		color: #15803d;
	}

	.filas.cero {
		color: #9ca3af;
		font-weight: 400;
	}

	.estado {
		font-size: 0.72rem;
		font-weight: 600;
		border-radius: 6px;
		padding: 0.05rem 0.4rem;
		white-space: nowrap;
	}

	.estado.con-datos {
		color: #15803d;
		background: rgba(21, 128, 61, 0.1);
	}

	.estado.vacia {
		color: #b45309;
		background: rgba(180, 83, 9, 0.1);
	}

	.estado.no-existe {
		color: #9ca3af;
		background: rgba(107, 114, 128, 0.06);
	}

	.convenciones {
		margin-top: 2rem;
		padding-top: 1.25rem;
		border-top: 1px solid rgba(17, 24, 39, 0.08);
	}

	.convenciones h2 {
		font-size: 0.95rem;
		font-weight: 600;
		color: #374151;
		margin: 0 0 0.6rem;
	}

	.convenciones ul {
		margin: 0;
		padding-left: 1.1rem;
		color: #6b7280;
		font-size: 0.82rem;
		line-height: 1.7;
	}
</style>
