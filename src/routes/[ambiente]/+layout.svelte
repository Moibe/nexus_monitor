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
		margin: 0 0 1.25rem;
		padding: 0.8rem 1rem;
		font-size: 0.85rem;
		line-height: 1.5;
		color: #7f1d1d;
		background: rgba(185, 28, 28, 0.1);
		border: 1px solid rgba(185, 28, 28, 0.35);
		border-radius: 10px;
	}

	.cruzado code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}
</style>
