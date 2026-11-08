<script lang="ts">
	// Capa delgada sobre el chrome del layout raíz: lo único que agrega es el
	// aviso de configuración cruzada, que tiene que verse en TODAS las
	// secciones del ambiente y no solo en una.
	let { data, children } = $props();
</script>

{#if data.cruzado}
	<div class="cruzado" role="alert">
		<strong>Cuidado:</strong> esta pestaña dice <strong>{data.definicion.etiqueta}</strong>, pero el
		back de <code>{data.destino}</code> se declara
		<strong>«{data.diceSer}»</strong>. Está mal apuntado en el <code>.env</code> — no operes aquí
		hasta arreglarlo.
	</div>
{/if}

{@render children()}

<style>
	.cruzado {
		margin: 0 0 1.5rem;
		padding: 0.8rem 1rem;
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--aviso-error-texto);
		background: var(--aviso-error-fondo);
		border: 1px solid var(--aviso-error-borde);
		border-radius: var(--radius-lg);
	}

	.cruzado code {
		font-family: var(--font-mono);
	}
</style>
