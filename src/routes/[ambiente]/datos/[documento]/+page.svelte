<script lang="ts">
	import { page } from '$app/state';
	import FichaDocumento from '$lib/FichaDocumento.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const ambiente = $derived(page.params.ambiente ?? 'dev');
</script>

{#if data.ficha}
	<FichaDocumento {ambiente} ficha={data.ficha} />
{:else}
	<div class="sin-ficha">
		<a href="/{ambiente}/datos">← Datos extraídos</a>
		<p class="error" data-testid="error-ficha">{data.error}</p>
	</div>
{/if}

<style>
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
</style>
