<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import { formatFecha, type ProcesadorParseado } from '$lib/procesadores';
	import { copiarTexto } from '$lib/copiar';
	import ModalConfirmarEliminar from '$lib/ModalConfirmarEliminar.svelte';
	import PanelHuerfanos from '$lib/PanelHuerfanos.svelte';

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

	let procesadorAEliminar = $state<{ id: string; displayName: string } | null>(null);
	let eliminando = $state(false);
	let errorEliminar = $state<string | null>(null);

	function pedirEliminar(p: ProcesadorParseado) {
		procesadorAEliminar = { id: p.id, displayName: p.displayName };
		errorEliminar = null;
	}

	function cancelarEliminar() {
		procesadorAEliminar = null;
		errorEliminar = null;
	}

	async function confirmarEliminar() {
		if (!procesadorAEliminar) return;
		eliminando = true;
		errorEliminar = null;
		try {
			const r = await fetch(`/api/procesadores/${procesadorAEliminar.id}`, { method: 'DELETE' });
			if (!r.ok) {
				const cuerpo = await r.json().catch(() => null);
				errorEliminar = cuerpo?.message ?? `Error ${r.status} al eliminar.`;
				return;
			}
			procesadorAEliminar = null;
			// Vuelve a pedir la lista (y el uso) al server en vez de solo quitar la
			// fila local: Document AI encola el borrado como una long-running
			// operation, así que lo honesto es reflejar lo que el server diga que
			// hay ahora (probablemente el procesador en state DELETING).
			await invalidateAll();
		} finally {
			eliminando = false;
		}
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

	type ColumnaOrden = 'nombre' | 'version' | 'estado' | 'uso' | 'id' | 'creado';

	const COLUMNAS: { valor: ColumnaOrden; etiqueta: string }[] = [
		{ valor: 'nombre', etiqueta: 'Nombre' },
		{ valor: 'version', etiqueta: 'Versión' },
		{ valor: 'estado', etiqueta: 'Estado' },
		{ valor: 'uso', etiqueta: 'Uso' },
		{ valor: 'id', etiqueta: 'ID' },
		{ valor: 'creado', etiqueta: 'Creado' }
	];

	let columnaOrden = $state<ColumnaOrden | null>(null);
	let direccionOrden = $state<'asc' | 'desc'>('asc');

	// Ciclo de 3 clics: asc -> desc -> quita el orden y regresa a la vista
	// agrupada por tipo (el orden por columna es plano; sin él, se agrupa).
	function alHacerClicColumna(columna: ColumnaOrden) {
		if (columnaOrden !== columna) {
			columnaOrden = columna;
			direccionOrden = 'asc';
		} else if (direccionOrden === 'asc') {
			direccionOrden = 'desc';
		} else {
			columnaOrden = null;
		}
	}

	function valorColumna(p: ProcesadorParseado, columna: ColumnaOrden): string | number {
		switch (columna) {
			case 'nombre':
				return p.displayName;
			case 'version':
				return p.version ?? -1;
			case 'estado':
				return p.state;
			case 'uso':
				return data.uso?.[p.id]?.ok ?? -1;
			case 'id':
				return p.id;
			case 'creado':
				return p.createTime;
		}
	}

	// Aplana los grupos ya filtrados (gruposVista) en una sola lista, ordenada
	// por la columna elegida. null = no hay orden por columna activo, se
	// muestra la vista agrupada de siempre.
	let filasOrdenadas = $derived.by(() => {
		if (!columnaOrden) return null;

		const columna = columnaOrden;
		const factor = direccionOrden === 'asc' ? 1 : -1;
		const filas = gruposVista.flatMap((g) => g.procesadores.map((p) => ({ ...p, grupoTitulo: g.titulo })));

		return filas.sort((a, b) => {
			const va = valorColumna(a, columna);
			const vb = valorColumna(b, columna);
			if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
			return String(va).localeCompare(String(vb), 'es') * factor;
		});
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

		<PanelHuerfanos onBorrados={invalidateAll} />
	{/if}

	{#if data.error}
		<p class="error">{data.error}</p>
	{:else}
	<!-- Todo lo del listado en UNA tarjeta, como «Listado de usuarios» de Biblioratum: filtros arriba, tabla debajo. -->
	<div class="listado">
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
			{#if !columnaOrden}
				<label class="orden-label">
					Orden de los grupos
					<select bind:value={orden}>
						<option value="alfabetico">Alfabético</option>
						<option value="mas-usados">Más usados primero</option>
						<option value="menos-usados">Menos usados primero</option>
					</select>
				</label>
			{:else}
				<p class="orden-label">Ordenado por columna — clic de nuevo en el encabezado para quitarlo.</p>
			{/if}
		</div>
	{/if}

	{#if data.grupos.length === 0}
		<p class="vacio">No hay procesadores.</p>
	{:else if gruposVista.length === 0}
		<p class="vacio">Ningún procesador coincide con el filtro.</p>
	{:else}
		<div class="tabla-wrap">
			<table class="tabla-procesadores">
				<thead>
					<tr>
						{#each COLUMNAS as columna}
							<th class={columna.valor === 'nombre' ? 'col-nombre' : ''}>
								<button
									type="button"
									class="th-orden"
									class:activo={columnaOrden === columna.valor}
									onclick={() => alHacerClicColumna(columna.valor)}
									title="Clic para ordenar; de nuevo invierte; una tercera vez quita el orden."
								>
									{columna.etiqueta}
									{#if columnaOrden === columna.valor}
										<span class="flecha">{direccionOrden === 'asc' ? '▲' : '▼'}</span>
									{/if}
								</button>
							</th>
						{/each}
						<th class="col-accion"><span class="sr-only">Acción</span></th>
					</tr>
				</thead>
				<tbody>
					{#if columnaOrden && filasOrdenadas}
						{#each filasOrdenadas as p (p.name)}
							{@render filaProcesador(p, p.grupoTitulo)}
						{/each}
					{:else}
						{#each gruposVista as grupo (grupo.titulo)}
							<tr class="fila-grupo">
								<th colspan="7">{grupo.titulo}</th>
							</tr>
							{#each grupo.procesadores as p (p.name)}
								{@render filaProcesador(p, null)}
							{/each}
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	{/if}
	</div>
	{/if}

	<ModalConfirmarEliminar
		procesador={procesadorAEliminar}
		{eliminando}
		error={errorEliminar}
		onConfirmar={confirmarEliminar}
		onCancelar={cancelarEliminar}
	/>
</div>

{#snippet filaProcesador(p: ProcesadorParseado, grupoTitulo: string | null)}
	{@const uso = usoDe(p.id)}
	<tr class="fila">
		<td class="col-nombre">
			{p.displayName}
			{#if grupoTitulo}
				<span class="grupo-inline">{grupoTitulo}</span>
			{/if}
		</td>
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
			<div class="acciones">
			<button type="button" class="copiar" onclick={() => copiarId(p.id)}>
				{copiadoId === p.id ? 'Copiado' : 'Copiar id'}
			</button>
			<button
				type="button"
				class="borrar"
				onclick={() => pedirEliminar(p)}
				aria-label={`Eliminar ${p.displayName}`}
				title="Eliminar procesador"
			>
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M3 6h18" />
					<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
					<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
					<path d="M10 11v6" />
					<path d="M14 11v6" />
				</svg>
			</button>
			</div>
		</td>
	</tr>
{/snippet}

<style>
	/* Una columna con aire parejo entre sus bloques: así no importa cuáles están (el aviso de uso, el panel de huérfanos,
	   el listado o el error) ni se acumulan márgenes. El encabezado y su nota van pegados (el -1.125rem se come el aire). */
	.procesadores {
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
		color: var(--muted-foreground);
		background: var(--muted);
		border-radius: var(--radius-sm);
		padding: 0.125rem 0.5rem;
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

	.cabecera + .nota-uso {
		margin-top: -1.125rem;
	}

	.nota-uso {
		margin: 0;
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	.nota-uso-error {
		color: var(--aviso-atencion-texto);
	}

	/* La tarjeta del listado: la de «Listado de usuarios» de Biblioratum (`rounded-2xl border-2 border-border bg-card p-5`). */
	.listado {
		background: var(--card);
		border: 2px solid var(--border);
		border-radius: var(--radius-2xl);
		padding: 1.25rem;
	}

	.controles {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.filtros {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.filtro-btn {
		height: 2rem;
		padding: 0 0.75rem;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--foreground);
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}

	.filtro-btn:hover {
		background: var(--muted);
	}

	.filtro-btn.activo {
		color: var(--primary-strong);
		background: var(--primary-soft);
		border-color: var(--primary-line);
	}

	.orden-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.orden-label select {
		height: 2rem;
		font: inherit;
		font-size: 0.75rem;
		color: var(--foreground);
		background: var(--card);
		border: 1px solid var(--input);
		border-radius: var(--radius-md);
		padding: 0 0.5rem;
		cursor: pointer;
	}

	.orden-label select:focus {
		outline: none;
		border-color: var(--ring);
		box-shadow: var(--ring-sombra);
	}

	.tabla-wrap {
		/* Única zona que puede crecer más ancha que el contenedor: en pantallas
		   angostas la tabla scrollea horizontal en vez de aplastar columnas. */
		overflow-x: auto;
	}

	/* Tabla plana, como la de usuarios de Biblioratum: encabezado de 12 px en gris con línea arriba y abajo, una línea
	   entre filas y nada de recuadros por fila. */
	.tabla-procesadores {
		width: 100%;
		border-collapse: collapse;
		/* Un punto menos que las otras tablas (13 px y no 14): es la más ancha —seis columnas y los botones—, y con la
		   tipografía de Biblioratum el nombre del procesador, que es largo, bajaba a tres renglones. */
		font-size: 0.8125rem;
	}

	.tabla-procesadores thead th {
		text-align: left;
		padding: 0;
		white-space: nowrap;
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
	}

	.th-orden {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin: 0;
		padding: 0.625rem 1rem 0.625rem 0.5rem;
		font: inherit;
		font-size: 0.75rem;
		color: var(--muted-foreground);
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.th-orden:hover {
		color: var(--foreground);
	}

	.th-orden.activo {
		color: var(--primary);
		font-weight: 600;
	}

	.flecha {
		font-size: 0.65rem;
	}

	.grupo-inline {
		display: block;
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--muted-foreground);
		margin-top: 0.1rem;
	}

	.fila-grupo th {
		text-align: left;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--foreground);
		text-transform: lowercase;
		background: var(--muted-soft);
		padding: 0.55rem 0.5rem;
		border-bottom: 1px solid var(--border);
	}

	.fila td {
		padding: 0.75rem 1rem 0.75rem 0.5rem;
		border-bottom: 1px solid var(--border);
		white-space: nowrap;
		vertical-align: middle;
	}

	/* El nombre baja de renglón (por los guiones) en vez de empujar el ID y los botones fuera de pantalla: Plus Jakarta
	   Sans es más ancha que la tipografía de sistema y a 1440 px ya no cabían. `.fila td` (más específico) le pone
	   `nowrap` a las demás celdas; esta lo vuelve a soltar. */
	.fila td.col-nombre {
		white-space: normal;
		color: var(--foreground);
	}

	/* Los botones de la fila van en su propio contenedor y no en el `td`: un `td` con `display: flex` deja de ser celda y
	   se le descuadra la línea de abajo. */
	.col-accion {
		text-align: right;
	}

	.acciones {
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.4rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	/* Insignias: la de «Estatus» de Biblioratum (`rounded-md px-2 py-0.5 text-xs font-medium`). */
	.version,
	.estado,
	.uso {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: var(--radius-sm);
		padding: 0.125rem 0.5rem;
		white-space: nowrap;
	}

	.version {
		color: var(--primary-strong);
		background: var(--primary-soft);
	}

	.estado {
		color: var(--muted-foreground);
		background: var(--muted);
	}

	.estado.enabled {
		color: var(--success);
		background: var(--success-soft);
	}

	.uso.usado {
		color: var(--success);
		background: var(--success-soft);
	}

	.uso.solo-error {
		color: var(--warning);
		background: var(--warning-soft);
	}

	.uso.sin-uso {
		color: var(--muted-foreground);
		background: var(--muted);
	}

	.id-corto {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--secondary-foreground);
		background: var(--muted);
		border-radius: var(--radius-sm);
		padding: 0.125rem 0.4rem;
	}

	.copiar {
		height: 1.75rem;
		padding: 0 0.6rem;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--foreground);
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.copiar:hover {
		background: var(--muted);
	}

	/* Gris hasta que se pasa el cursor: es la acción irreversible y no tiene por qué gritar en cada fila. */
	.borrar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		padding: 0;
		color: var(--muted-foreground);
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.borrar:hover {
		color: var(--destructive);
		background: var(--destructive-soft);
		border-color: var(--destructive-line);
	}
</style>
