<script lang="ts">
	// La limpieza de procesadores huérfanos, en pantalla. Buscar es de solo lectura (listar en Google no cobra) y se hace
	// a pedido, no al cargar la página: le pregunta a los tres nexus_back y no hace falta cada vez que se mira la lista.
	import { SvelteSet } from 'svelte/reactivity';
	import { formatFecha } from '$lib/procesadores';
	import ModalBorrarHuerfanos from '$lib/ModalBorrarHuerfanos.svelte';

	type Resumido = { id: string; displayName: string; createTime: string };
	type Dueno = { ambiente: string; tenant: string; tipo: string };
	type Reparto = {
		huerfanos: Resumido[];
		conDueno: (Resumido & { duenos: Dueno[] })[];
		protegidos: Resumido[];
		sueltos: { id: string; duenos: Dueno[] }[];
	};
	type Resultado = { id: string; resultado: 'borrado' | 'omitido' | 'fallo'; detalle?: string };

	/** Se llama después de borrar, para que la tabla de abajo deje de enseñar lo que ya no existe. */
	let { onBorrados }: { onBorrados: () => Promise<void> | void } = $props();

	let buscando = $state(false);
	let errorBuscar = $state<string | null>(null);
	let reparto = $state<Reparto | null>(null);
	const elegidos = new SvelteSet<string>();

	let confirmando = $state(false);
	let borrando = $state(false);
	let errorBorrar = $state<string | null>(null);
	let resultados = $state<Resultado[] | null>(null);

	async function mensajeDe(r: Response, defecto: string): Promise<string> {
		const cuerpo = await r.json().catch(() => null);
		return (cuerpo?.message as string | undefined) ?? defecto;
	}

	async function buscar() {
		buscando = true;
		errorBuscar = null;
		try {
			const r = await fetch('/api/procesadores/huerfanos');
			if (!r.ok) {
				reparto = null;
				errorBuscar = await mensajeDe(r, `Error ${r.status} al buscar huérfanos.`);
				return;
			}
			reparto = (await r.json()) as Reparto;
			// Todos marcados de entrada: es lo que hacía el script. Se desmarca lo que se quiera conservar.
			elegidos.clear();
			reparto.huerfanos.forEach((p) => elegidos.add(p.id));
		} catch {
			errorBuscar = 'No se pudo contactar a Monitor.';
		} finally {
			buscando = false;
		}
	}

	function alternar(id: string) {
		if (elegidos.has(id)) elegidos.delete(id);
		else elegidos.add(id);
	}

	let todosMarcados = $derived(reparto !== null && reparto.huerfanos.length > 0 && elegidos.size === reparto.huerfanos.length);

	function alternarTodos() {
		if (!reparto) return;
		if (todosMarcados) elegidos.clear();
		else reparto.huerfanos.forEach((p) => elegidos.add(p.id));
	}

	async function borrar() {
		borrando = true;
		errorBorrar = null;
		try {
			const r = await fetch('/api/procesadores/huerfanos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: [...elegidos] })
			});
			if (!r.ok) {
				errorBorrar = await mensajeDe(r, `Error ${r.status} al borrar.`);
				return;
			}
			resultados = ((await r.json()) as { resultados: Resultado[] }).resultados;
			confirmando = false;
			await onBorrados();
			await buscar();
		} catch {
			errorBorrar = 'No se pudo contactar a Monitor.';
		} finally {
			borrando = false;
		}
	}

	const cuenta = (rs: Resultado[], tipo: Resultado['resultado']) => rs.filter((r) => r.resultado === tipo).length;
</script>

<section class="huerfanos" data-testid="panel-huerfanos">
	<div class="encabezado">
		<div>
			<h2>Huérfanos</h2>
			<p class="explica">
				Procesadores <code>biblioratum--</code> (o <code>nexusdoc--</code>, los de antes) que ningún tipo documental señala en <strong>ninguno</strong> de los tres ambientes, y
				clasificadores de organizaciones que ya no existen.
			</p>
		</div>
		<button type="button" class="btn-buscar" data-testid="buscar-huerfanos" disabled={buscando || borrando} onclick={buscar}>
			{buscando ? 'Buscando…' : reparto ? 'Volver a buscar' : 'Buscar huérfanos'}
		</button>
	</div>

	{#if errorBuscar}
		<p class="error" data-testid="error-huerfanos">{errorBuscar}</p>
	{/if}

	{#if resultados}
		<p class="resultado" data-testid="resultado-borrado">
			Borrados: {cuenta(resultados, 'borrado')}
			{#if cuenta(resultados, 'omitido')}· omitidos (dejaron de ser huérfanos): {cuenta(resultados, 'omitido')}{/if}
			{#if cuenta(resultados, 'fallo')}· <span class="mal">fallaron: {cuenta(resultados, 'fallo')}</span>{/if}
			<button type="button" class="cerrar" aria-label="Ocultar el resultado" onclick={() => (resultados = null)}>×</button>
		</p>
		{#each resultados.filter((r) => r.resultado === 'fallo') as f (f.id)}
			<p class="error"><code>{f.id}</code>: {f.detalle}</p>
		{/each}
	{/if}

	{#if reparto}
		<p class="conteos" data-testid="conteos-huerfanos">
			<span class="pastilla huerfano">{reparto.huerfanos.length} huérfanos</span>
			<span class="pastilla">{reparto.conDueno.length} con dueño</span>
			<span class="pastilla">{reparto.protegidos.length} protegidos</span>
		</p>

		{#if reparto.sueltos.length > 0}
			<p class="aviso">
				{reparto.sueltos.length} tipo{reparto.sueltos.length === 1 ? '' : 's'} señala{reparto.sueltos.length === 1 ? '' : 'n'} un
				procesador que ya no existe en Google:
				{#each reparto.sueltos as s, i (s.id)}
					{i > 0 ? ', ' : ''}<code>{s.id}</code> ({s.duenos.map((d) => `${d.ambiente}: ${d.tipo}`).join(', ')})
				{/each}. No se toca nada; es solo para que lo sepas.
			</p>
		{/if}

		{#if reparto.huerfanos.length === 0}
			<p class="vacio">No hay huérfanos. 🎉</p>
		{:else}
			<div class="tabla-wrap">
				<table class="tabla-huerfanos">
					<thead>
						<tr>
							<th class="col-check">
								<input type="checkbox" aria-label="Marcar todos" checked={todosMarcados} onchange={alternarTodos} disabled={borrando} />
							</th>
							<th>Nombre</th>
							<th>ID</th>
							<th>Creado</th>
						</tr>
					</thead>
					<tbody>
						{#each reparto.huerfanos as p (p.id)}
							<tr data-testid="fila-huerfano">
								<td class="col-check">
									<input
										type="checkbox"
										aria-label={`Marcar ${p.displayName}`}
										checked={elegidos.has(p.id)}
										onchange={() => alternar(p.id)}
										disabled={borrando}
									/>
								</td>
								<td class="nombre">{p.displayName}</td>
								<td><code>{p.id}</code></td>
								<td>{p.createTime ? formatFecha(p.createTime) : '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="acciones">
				<button
					type="button"
					class="btn-borrar"
					data-testid="borrar-huerfanos"
					disabled={elegidos.size === 0 || borrando}
					onclick={() => {
						errorBorrar = null;
						confirmando = true;
					}}
				>
					Borrar {elegidos.size} marcado{elegidos.size === 1 ? '' : 's'}
				</button>
			</div>
		{/if}
	{/if}

	<ModalBorrarHuerfanos
		cantidad={confirmando ? elegidos.size : 0}
		{borrando}
		error={errorBorrar}
		onConfirmar={borrar}
		onCancelar={() => (confirmando = false)}
	/>
</section>

<style>
	/* La tarjeta de sección de Biblioratum (`rounded-2xl border-2 border-border bg-card p-5`). El aire de afuera lo pone
	   la columna de la página. */
	.huerfanos {
		background: var(--card);
		border: 2px solid var(--border);
		border-radius: var(--radius-2xl);
		padding: 1.25rem;
	}

	.encabezado {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	h2 {
		margin: 0 0 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.explica {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--muted-foreground);
	}

	code {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--secondary-foreground);
	}

	.btn-buscar,
	.btn-borrar {
		height: 2.25rem;
		padding: 0 1rem;
		font: inherit;
		font-size: 0.875rem;
		font-weight: 500;
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		white-space: nowrap;
		transition:
			background 0.15s ease,
			opacity 0.15s ease;
	}

	.btn-buscar {
		color: var(--primary-foreground);
		background: var(--primary);
	}

	.btn-buscar:hover:not(:disabled) {
		background: var(--primary-hover);
	}

	/* El «destructive» de Biblioratum: rojo suave, no relleno. */
	.btn-borrar {
		color: var(--destructive);
		background: var(--destructive-soft);
	}

	.btn-borrar:hover:not(:disabled) {
		background: var(--destructive-soft-hover);
	}

	.btn-buscar:disabled,
	.btn-borrar:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error {
		margin: 0.85rem 0 0;
		font-size: 0.8125rem;
		color: var(--aviso-error-texto);
		background: var(--aviso-error-fondo);
		border: 1px solid var(--aviso-error-borde);
		border-radius: var(--radius-lg);
		padding: 0.6rem 0.8rem;
	}

	.aviso {
		margin: 0.85rem 0 0;
		font-size: 0.8125rem;
		color: var(--aviso-atencion-texto);
		background: var(--aviso-atencion-fondo);
		border: 1px solid var(--aviso-atencion-borde);
		border-radius: var(--radius-lg);
		padding: 0.6rem 0.8rem;
	}

	.resultado {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0.85rem 0 0;
		font-size: 0.8125rem;
		color: var(--aviso-ok-texto);
		background: var(--aviso-ok-fondo);
		border: 1px solid var(--aviso-ok-borde);
		border-radius: var(--radius-lg);
		padding: 0.6rem 0.8rem;
	}

	.resultado .mal {
		color: var(--aviso-error-texto);
	}

	.cerrar {
		margin-left: auto;
		font: inherit;
		font-size: 1rem;
		line-height: 1;
		color: var(--muted-foreground);
		background: none;
		border: none;
		cursor: pointer;
	}

	.conteos {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 1rem 0 0;
	}

	.pastilla {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--muted-foreground);
		background: var(--muted);
		border-radius: var(--radius-sm);
		padding: 0.125rem 0.5rem;
	}

	.pastilla.huerfano {
		color: var(--destructive);
		background: var(--destructive-soft);
	}

	.vacio {
		margin: 0.85rem 0 0;
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	.tabla-wrap {
		overflow-x: auto;
		margin-top: 1rem;
	}

	.tabla-huerfanos {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.tabla-huerfanos th {
		text-align: left;
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--muted-foreground);
		padding: 0.625rem 1rem 0.625rem 0.5rem;
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
	}

	.tabla-huerfanos td {
		padding: 0.65rem 1rem 0.65rem 0.5rem;
		border-bottom: 1px solid var(--border);
	}

	.tabla-huerfanos tbody tr:last-child td {
		border-bottom: none;
	}

	.col-check {
		width: 1.5rem;
	}

	.col-check input {
		accent-color: var(--primary);
	}

	.nombre {
		font-weight: 500;
	}

	.acciones {
		display: flex;
		justify-content: flex-end;
		margin-top: 1rem;
	}
</style>
