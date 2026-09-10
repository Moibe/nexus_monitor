<script lang="ts">
	import type { PageData } from './$types';
	import { formatFecha } from '$lib/procesadores';
	import { copiarTexto } from '$lib/copiar';

	let { data }: { data: PageData } = $props();

	let copiadoId = $state<string | null>(null);

	async function copiarId(id: string) {
		const ok = await copiarTexto(id);
		if (!ok) return;
		copiadoId = id;
		setTimeout(() => {
			if (copiadoId === id) copiadoId = null;
		}, 1500);
	}

	type ClaseUso = 'usado' | 'sin-uso' | 'solo-error';

	// null (sin cruce disponible) se maneja aparte en cada llamador: esta
	// función solo corre cuando data.uso ya existe.
	function claseUso(id: string): ClaseUso {
		const entry = data.uso?.[id];
		if (!entry || (entry.ok === 0 && entry.error === 0)) return 'sin-uso';
		if (entry.ok > 0) return 'usado';
		return 'solo-error';
	}

	function usoDe(id: string) {
		if (!data.uso) return null;
		const entry = data.uso[id];
		const clase = claseUso(id);
		if (clase === 'usado') return { texto: `${entry!.ok} procesados`, clase };
		if (clase === 'solo-error') return { texto: `solo errores (${entry!.error})`, clase };
		return { texto: 'sin uso', clase };
	}

	const OPCIONES_FILTRO: { valor: 'todos' | ClaseUso; etiqueta: string }[] = [
		{ valor: 'todos', etiqueta: 'Todos' },
		{ valor: 'usado', etiqueta: 'Con uso' },
		{ valor: 'solo-error', etiqueta: 'Solo errores' },
		{ valor: 'sin-uso', etiqueta: 'Sin uso' }
	];

	let filtro = $state<'todos' | ClaseUso>('todos');
	let orden = $state<'alfabetico' | 'mas-usados' | 'menos-usados'>('alfabetico');

	// Cuenta cuántos procesadores (no grupos) caen en cada clase, para
	// mostrarlo junto a cada botón de filtro. Contra el arreglo completo,
	// sin filtrar todavía — así el número no cambia cuando cambias de filtro.
	let conteoPorClase = $derived.by(() => {
		const c: Record<'todos' | ClaseUso, number> = {
			todos: 0,
			usado: 0,
			'sin-uso': 0,
			'solo-error': 0
		};
		if (!data.uso) return c;
		for (const g of data.grupos) {
			for (const p of g.procesadores) {
				c.todos++;
				c[claseUso(p.id)]++;
			}
		}
		return c;
	});

	// Filtra por fila (procesador) y ordena por grupo. El orden interno de
	// cada grupo (versión descendente) se respeta siempre — "más/menos
	// usados" reordena los GRUPOS por su total, no las filas adentro.
	let gruposVista = $derived.by(() => {
		if (!data.uso) return data.grupos;

		let grupos = data.grupos
			.map((g) => {
				const procesadores =
					filtro === 'todos' ? g.procesadores : g.procesadores.filter((p) => claseUso(p.id) === filtro);
				const totalOk = g.procesadores.reduce((s, p) => s + (data.uso?.[p.id]?.ok ?? 0), 0);
				return { ...g, procesadores, totalOk };
			})
			.filter((g) => g.procesadores.length > 0);

		if (orden === 'mas-usados') grupos = [...grupos].sort((a, b) => b.totalOk - a.totalOk);
		else if (orden === 'menos-usados') grupos = [...grupos].sort((a, b) => a.totalOk - b.totalOk);

		return grupos;
	});
</script>

<div class="procesadores">
	<header class="cabecera">
		<h1>Procesadores de Document AI</h1>
		{#if !data.error}
			<span class="total">{data.total} vivos</span>
		{/if}
	</header>

	{#if !data.error}
		{#if data.usoError}
			<p class="nota-uso nota-uso-error">Uso no disponible: {data.usoError}</p>
		{:else if data.ventanaDias}
			<p class="nota-uso">
				Uso: acumulado de Cloud Monitoring de los últimos {Math.round(data.ventanaDias / 30)} meses
				(el máximo que permite consultar).
			</p>
		{/if}
	{/if}

	{#if data.uso && data.grupos.length > 0}
		<div class="controles">
			<div class="filtros" role="group" aria-label="Filtrar por uso">
				{#each OPCIONES_FILTRO as opcion}
					<button
						type="button"
						class="filtro-btn"
						class:activo={filtro === opcion.valor}
						onclick={() => (filtro = opcion.valor)}
					>
						{opcion.etiqueta} ({conteoPorClase[opcion.valor]})
					</button>
				{/each}
			</div>
			<label class="orden-label">
				Orden
				<select bind:value={orden}>
					<option value="alfabetico">Alfabético</option>
					<option value="mas-usados">Más usados primero</option>
					<option value="menos-usados">Menos usados primero</option>
				</select>
			</label>
		</div>
	{/if}

	{#if data.error}
		<p class="error">{data.error}</p>
	{:else if data.grupos.length === 0}
		<p class="vacio">No hay procesadores.</p>
	{:else if gruposVista.length === 0}
		<p class="vacio">Ningún procesador coincide con el filtro.</p>
	{:else}
		<div class="tabla-wrap">
			<table class="tabla-procesadores">
				<thead>
					<tr>
						<th class="col-nombre">Nombre</th>
						<th>Versión</th>
						<th>Estado</th>
						<th>Uso</th>
						<th>ID</th>
						<th>Creado</th>
						<th class="col-accion"><span class="sr-only">Acción</span></th>
					</tr>
				</thead>
				<tbody>
					{#each gruposVista as grupo (grupo.titulo)}
						<tr class="fila-grupo">
							<th colspan="7">{grupo.titulo}</th>
						</tr>
						{#each grupo.procesadores as p (p.name)}
							{@const uso = usoDe(p.id)}
							<tr class="fila">
								<td class="col-nombre">{p.displayName}</td>
								<td>
									{#if p.version !== null}
										<span class="version">v{p.version}</span>
									{/if}
								</td>
								<td>
									<span class="estado" class:enabled={p.state === 'ENABLED'}>{p.state}</span>
								</td>
								<td>
									{#if uso}
										<span class="uso {uso.clase}">{uso.texto}</span>
									{/if}
								</td>
								<td><code class="id-corto">{p.id}</code></td>
								<td>{formatFecha(p.createTime)}</td>
								<td class="col-accion">
									<button type="button" class="copiar" onclick={() => copiarId(p.id)}>
										{copiadoId === p.id ? 'Copiado' : 'Copiar id'}
									</button>
								</td>
							</tr>
						{/each}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.procesadores {
		padding: 1.5rem 0.5rem 2.5rem;
		max-width: 860px;
		margin: 0 auto;
	}

	.cabecera {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
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

	.error {
		color: #b91c1c;
		background: rgba(185, 28, 28, 0.06);
		border: 1px solid rgba(185, 28, 28, 0.2);
		border-radius: 10px;
		padding: 0.75rem 1rem;
	}

	.vacio {
		color: #6b7280;
	}

	.nota-uso {
		font-size: 0.78rem;
		color: #6b7280;
		margin: -0.75rem 0 1.25rem;
	}

	.nota-uso-error {
		color: #92400e;
	}

	.uso {
		font-size: 0.72rem;
		font-weight: 600;
		border-radius: 6px;
		padding: 0.05rem 0.4rem;
		white-space: nowrap;
	}

	.uso.usado {
		color: #15803d;
		background: rgba(21, 128, 61, 0.1);
	}

	.uso.solo-error {
		color: #b45309;
		background: rgba(180, 83, 9, 0.1);
	}

	.uso.sin-uso {
		color: #9ca3af;
		background: rgba(107, 114, 128, 0.06);
	}

	.controles {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid rgba(17, 24, 39, 0.08);
	}

	.filtros {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.filtro-btn {
		font: inherit;
		font-size: 0.78rem;
		color: #374151;
		background: rgba(17, 24, 39, 0.03);
		border: 1px solid rgba(17, 24, 39, 0.1);
		border-radius: 999px;
		padding: 0.3rem 0.75rem;
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}

	.filtro-btn:hover {
		background: rgba(37, 99, 235, 0.08);
		border-color: rgba(37, 99, 235, 0.2);
	}

	.filtro-btn.activo {
		color: #1d4ed8;
		background: rgba(37, 99, 235, 0.12);
		border-color: rgba(37, 99, 235, 0.35);
		font-weight: 600;
	}

	.orden-label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		color: #6b7280;
	}

	.orden-label select {
		font: inherit;
		font-size: 0.78rem;
		color: #1f2937;
		background: rgba(17, 24, 39, 0.03);
		border: 1px solid rgba(17, 24, 39, 0.1);
		border-radius: 8px;
		padding: 0.3rem 0.5rem;
		cursor: pointer;
	}

	.tabla-wrap {
		/* Única zona que puede crecer más ancha que el contenedor: en pantallas
		   angostas la tabla scrollea horizontal en vez de aplastar columnas. */
		overflow-x: auto;
	}

	.tabla-procesadores {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0 0.3rem;
		font-size: 0.86rem;
	}

	.tabla-procesadores thead th {
		text-align: left;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #9ca3af;
		padding: 0 0.8rem 0.5rem;
		white-space: nowrap;
	}

	.fila-grupo th {
		text-align: left;
		font-size: 0.95rem;
		font-weight: 600;
		color: #374151;
		text-transform: lowercase;
		padding: 0.9rem 0.4rem 0.4rem;
		border-bottom: 1px solid rgba(17, 24, 39, 0.08);
	}

	.fila-grupo:first-child th {
		padding-top: 0.2rem;
	}

	.fila td {
		padding: 0.55rem 0.8rem;
		border-top: 1px solid rgba(17, 24, 39, 0.06);
		border-bottom: 1px solid rgba(17, 24, 39, 0.06);
		background: rgba(17, 24, 39, 0.015);
		white-space: nowrap;
		vertical-align: middle;
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
	}

	.col-nombre {
		width: 100%;
		white-space: normal;
		color: #1f2937;
	}

	.col-accion {
		text-align: right;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	.version {
		font-size: 0.75rem;
		font-weight: 600;
		color: #1d4ed8;
		background: rgba(37, 99, 235, 0.1);
		border-radius: 6px;
		padding: 0.05rem 0.4rem;
	}

	.estado {
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: #6b7280;
		background: rgba(107, 114, 128, 0.1);
		border-radius: 6px;
		padding: 0.05rem 0.4rem;
	}

	.estado.enabled {
		color: #15803d;
		background: rgba(21, 128, 61, 0.1);
	}

	.id-corto {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		background: rgba(17, 24, 39, 0.05);
		border-radius: 6px;
		padding: 0.1rem 0.4rem;
	}

	.copiar {
		font: inherit;
		font-size: 0.75rem;
		color: #1d4ed8;
		background: rgba(37, 99, 235, 0.08);
		border: 1px solid rgba(37, 99, 235, 0.2);
		border-radius: 6px;
		padding: 0.15rem 0.5rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.copiar:hover {
		background: rgba(37, 99, 235, 0.15);
	}
</style>
