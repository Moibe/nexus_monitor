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
				Procesadores <code>nexusdoc--</code> que ningún tipo documental señala en <strong>ninguno</strong> de los tres ambientes, y
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
	.huerfanos {
		margin: 0 0 1.75rem;
		padding: 1rem 1.1rem 1.1rem;
		background: rgba(17, 24, 39, 0.02);
		border: 1px solid rgba(17, 24, 39, 0.08);
		border-radius: 12px;
	}

	.encabezado {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	h2 {
		margin: 0 0 0.25rem;
		font-size: 0.95rem;
	}

	.explica {
		margin: 0;
		font-size: 0.8rem;
		color: #6b7280;
	}

	code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.78rem;
		color: #4b5563;
	}

	.btn-buscar,
	.btn-borrar {
		font: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		border-radius: 8px;
		padding: 0.45rem 1rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-buscar {
		color: #ffffff;
		background: #2563eb;
		border: 1px solid #2563eb;
	}

	.btn-buscar:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.btn-borrar {
		color: #ffffff;
		background: #b91c1c;
		border: 1px solid #b91c1c;
	}

	.btn-borrar:hover:not(:disabled) {
		background: #991b1b;
	}

	.btn-buscar:disabled,
	.btn-borrar:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error {
		margin: 0.75rem 0 0;
		font-size: 0.82rem;
		color: #b91c1c;
		background: rgba(185, 28, 28, 0.06);
		border: 1px solid rgba(185, 28, 28, 0.2);
		border-radius: 8px;
		padding: 0.5rem 0.7rem;
	}

	.aviso {
		margin: 0.75rem 0 0;
		font-size: 0.8rem;
		color: #92400e;
		background: rgba(180, 83, 9, 0.06);
		border: 1px solid rgba(180, 83, 9, 0.18);
		border-radius: 8px;
		padding: 0.5rem 0.7rem;
	}

	.resultado {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0.75rem 0 0;
		font-size: 0.82rem;
		color: #15803d;
		background: rgba(21, 128, 61, 0.06);
		border: 1px solid rgba(21, 128, 61, 0.2);
		border-radius: 8px;
		padding: 0.5rem 0.7rem;
	}

	.resultado .mal {
		color: #b91c1c;
	}

	.cerrar {
		margin-left: auto;
		font: inherit;
		font-size: 1rem;
		line-height: 1;
		color: #6b7280;
		background: none;
		border: none;
		cursor: pointer;
	}

	.conteos {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0.85rem 0 0;
	}

	.pastilla {
		font-size: 0.75rem;
		color: #6b7280;
		background: rgba(17, 24, 39, 0.04);
		border: 1px solid rgba(17, 24, 39, 0.1);
		border-radius: 999px;
		padding: 0.1rem 0.6rem;
	}

	.pastilla.huerfano {
		font-weight: 600;
		color: #b91c1c;
		background: rgba(185, 28, 28, 0.06);
		border-color: rgba(185, 28, 28, 0.2);
	}

	.vacio {
		margin: 0.75rem 0 0;
		font-size: 0.85rem;
		color: #6b7280;
	}

	.tabla-wrap {
		overflow-x: auto;
		margin-top: 0.75rem;
	}

	.tabla-huerfanos {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82rem;
	}

	.tabla-huerfanos th {
		text-align: left;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: #6b7280;
		padding: 0.4rem 0.6rem;
		border-bottom: 1px solid rgba(17, 24, 39, 0.1);
	}

	.tabla-huerfanos td {
		padding: 0.4rem 0.6rem;
		border-bottom: 1px solid rgba(17, 24, 39, 0.05);
	}

	.col-check {
		width: 1.5rem;
	}

	.nombre {
		font-weight: 600;
	}

	.acciones {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.75rem;
	}
</style>
