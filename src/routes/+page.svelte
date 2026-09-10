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
</script>

<div class="procesadores">
	<header class="cabecera">
		<h1>Procesadores de Document AI</h1>
		{#if !data.error}
			<span class="total">{data.total} vivos</span>
		{/if}
	</header>

	{#if data.error}
		<p class="error">{data.error}</p>
	{:else if data.grupos.length === 0}
		<p class="vacio">No hay procesadores.</p>
	{:else}
		{#each data.grupos as grupo (grupo.titulo)}
			<section class="grupo">
				<h2>{grupo.titulo}</h2>
				<ul>
					{#each grupo.procesadores as p (p.name)}
						<li class="fila">
							<div class="fila-principal">
								<span class="display-name">{p.displayName}</span>
								{#if p.version !== null}
									<span class="version">v{p.version}</span>
								{/if}
								<span class="estado" class:enabled={p.state === 'ENABLED'}>{p.state}</span>
							</div>
							<div class="fila-meta">
								<code class="id-corto">{p.id}</code>
								<button type="button" class="copiar" onclick={() => copiarId(p.id)}>
									{copiadoId === p.id ? 'Copiado' : 'Copiar id'}
								</button>
								<span class="fecha">{formatFecha(p.createTime)}</span>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
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

	.grupo {
		margin-bottom: 1.75rem;
	}

	.grupo h2 {
		font-size: 0.95rem;
		font-weight: 600;
		color: #374151;
		text-transform: lowercase;
		margin: 0 0 0.6rem;
		padding-bottom: 0.35rem;
		border-bottom: 1px solid rgba(17, 24, 39, 0.08);
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.fila {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		padding: 0.55rem 0.8rem;
		border-radius: 10px;
		border: 1px solid rgba(17, 24, 39, 0.06);
		background: rgba(17, 24, 39, 0.015);
	}

	.fila-principal {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.display-name {
		font-size: 0.92rem;
		color: #1f2937;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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

	.fila-meta {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.78rem;
		color: #6b7280;
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

	.fecha {
		white-space: nowrap;
	}
</style>
