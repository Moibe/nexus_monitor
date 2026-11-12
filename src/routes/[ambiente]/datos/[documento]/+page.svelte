<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import FichaDocumento from '$lib/FichaDocumento.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const ambiente = $derived(page.params.ambiente ?? 'dev');
	const enlace = (id: string) => `/${ambiente}/datos/${id}${data.consulta}`;

	// ← y → también mueven, salvo mientras se escribe en un campo.
	function teclado(e: KeyboardEvent) {
		const destino = e.target as HTMLElement | null;
		if (destino?.closest('input, textarea, select, [contenteditable="true"]')) return;
		if (e.altKey || e.ctrlKey || e.metaKey) return;
		if (e.key === 'ArrowLeft' && data.anterior) goto(enlace(data.anterior));
		else if (e.key === 'ArrowRight' && data.siguiente) goto(enlace(data.siguiente));
	}
</script>

<svelte:window onkeydown={teclado} />

{#snippet flecha(id: string | null, lado: 'anterior' | 'siguiente')}
	{#if id}
		<a class="flecha" href={enlace(id)} aria-label={lado === 'anterior' ? 'Documento anterior' : 'Documento siguiente'} title={lado === 'anterior' ? 'Anterior (←)' : 'Siguiente (→)'} data-testid="ficha-{lado}">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d={lado === 'anterior' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
			</svg>
		</a>
	{:else}
		<span class="flecha apagada" aria-hidden="true">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
				<path d={lado === 'anterior' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
			</svg>
		</span>
	{/if}
{/snippet}

<!-- Tres columnas: flecha, ficha, flecha. Las flechas van pegadas a media pantalla mientras se baja. -->
<div class="marco">
	<div class="lado">{@render flecha(data.anterior, 'anterior')}</div>

	<div class="centro">
		{#if data.total > 0}
			<p class="posicion" data-testid="ficha-posicion">{data.posicion} de {data.total}</p>
		{/if}
		{#if data.ficha}
			<FichaDocumento {ambiente} ficha={data.ficha} volverA={`/${ambiente}/datos${data.consulta}`} />
		{:else}
			<div class="sin-ficha">
				<a href="/{ambiente}/datos{data.consulta}">← Datos extraídos</a>
				<p class="error" data-testid="error-ficha">{data.error}</p>
			</div>
		{/if}
	</div>

	<div class="lado">{@render flecha(data.siguiente, 'siguiente')}</div>
</div>

<style>
	.marco {
		display: grid;
		grid-template-columns: 2.75rem minmax(0, 1fr) 2.75rem;
		gap: 1rem;
	}

	.lado {
		position: relative;
	}

	.flecha {
		position: sticky;
		top: calc(50vh - 1.375rem);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		color: var(--foreground);
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 999px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
		text-decoration: none;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}

	a.flecha:hover {
		color: var(--primary-foreground);
		background: var(--primary);
		border-color: var(--primary);
	}

	.flecha.apagada {
		color: var(--border);
		box-shadow: none;
	}

	.centro {
		position: relative;
		min-width: 0;
	}

	/* «3 de 23», arriba a la derecha, a la altura del enlace de vuelta. */
	.posicion {
		position: absolute;
		top: 0;
		right: 0;
		margin: 0;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
	}

	.sin-ficha {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.sin-ficha a {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		text-decoration: none;
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

	@media (max-width: 700px) {
		.marco {
			grid-template-columns: 2.25rem minmax(0, 1fr) 2.25rem;
			gap: 0.5rem;
		}
		.flecha {
			width: 2.25rem;
			height: 2.25rem;
		}
	}
</style>
