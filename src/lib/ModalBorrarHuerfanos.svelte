<script lang="ts">
	// Hermano de ModalConfirmarEliminar, para borrar VARIOS procesadores de una vez. En vez de teclear un id (serían muchos) se
	// teclea BORRAR, igual que pedía `limpiar_procesadores_huerfanos.py --borrar`.
	let {
		cantidad,
		borrando,
		error,
		onConfirmar,
		onCancelar
	}: {
		/** Cuántos se van a borrar; con 0 el modal está cerrado. */
		cantidad: number;
		borrando: boolean;
		error: string | null;
		onConfirmar: () => void;
		onCancelar: () => void;
	} = $props();

	const PALABRA = 'BORRAR';
	let texto = $state('');

	$effect(() => {
		if (cantidad > 0) texto = '';
	});

	let coincide = $derived(texto.trim() === PALABRA);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !borrando) onCancelar();
	}
</script>

<svelte:window onkeydown={cantidad > 0 ? handleKeydown : undefined} />

{#if cantidad > 0}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="overlay" onclick={() => !borrando && onCancelar()}>
		<div
			class="modal"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="titulo-borrar-huerfanos"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 id="titulo-borrar-huerfanos">Borrar {cantidad} procesador{cantidad === 1 ? '' : 'es'} huérfano{cantidad === 1 ? '' : 's'}</h2>

			<p class="advertencia">
				Es <strong>irreversible</strong>: se va cada procesador con su dataset y su esquema. Antes de borrar, Monitor vuelve a
				preguntarle a los tres ambientes y se salta cualquiera que haya dejado de ser huérfano.
			</p>

			<label class="campo">
				Escribe {PALABRA} para confirmar
				<input type="text" bind:value={texto} placeholder={PALABRA} disabled={borrando} autocomplete="off" spellcheck="false" />
			</label>

			{#if error}
				<p class="error">{error}</p>
			{/if}

			<div class="botones">
				<button type="button" class="btn-cancelar" onclick={onCancelar} disabled={borrando}>Cancelar</button>
				<button type="button" class="btn-eliminar" disabled={!coincide || borrando} onclick={onConfirmar}>
					{borrando ? 'Borrando…' : 'Borrar definitivamente'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* El molde del `AlertDialog` de Biblioratum: velo negro al 10 % con un poco de desenfoque, tarjeta de 12 px de
	   radio con borde fino y los mismos botones de siempre (cancelar «outline», confirmar «destructive» suave). */
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.1);
		backdrop-filter: blur(2px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 70;
	}

	.modal {
		width: 100%;
		max-width: 28rem;
		background: var(--card);
		color: var(--foreground);
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
		padding: 1.75rem 1.5rem 1.5rem;
	}

	.modal h2 {
		margin: 0 0 0.75rem;
		font-size: 1.125rem;
		font-weight: 600;
	}



	.advertencia {
		margin: 0 0 1rem;
		font-size: 0.8125rem;
		line-height: 1.5;
		color: var(--aviso-atencion-texto);
		background: var(--aviso-atencion-fondo);
		border: 1px solid var(--aviso-atencion-borde);
		border-radius: var(--radius-lg);
		padding: 0.65rem 0.8rem;
	}

	.campo {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.75rem;
		color: var(--muted-foreground);
		margin-bottom: 1rem;
	}

	.campo input {
		box-sizing: border-box;
		height: 2.25rem;
		font: inherit;
		font-size: 0.875rem;
		font-family: var(--font-mono);
		color: var(--foreground);
		background: var(--card);
		border: 1px solid var(--input);
		border-radius: var(--radius-md);
		padding: 0 0.65rem;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.campo input:focus {
		outline: none;
		border-color: var(--ring);
		box-shadow: var(--ring-sombra);
	}

	.error {
		margin: 0 0 1rem;
		font-size: 0.8125rem;
		color: var(--aviso-error-texto);
		background: var(--aviso-error-fondo);
		border: 1px solid var(--aviso-error-borde);
		border-radius: var(--radius-lg);
		padding: 0.5rem 0.7rem;
	}

	.botones {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.btn-cancelar,
	.btn-eliminar {
		height: 2.25rem;
		padding: 0 1rem;
		font: inherit;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition:
			background 0.15s ease,
			opacity 0.15s ease;
	}

	/* «outline» de Biblioratum. */
	.btn-cancelar {
		color: var(--foreground);
		background: var(--card);
		border: 1px solid var(--border);
	}

	.btn-cancelar:hover:not(:disabled) {
		background: var(--muted);
	}

	/* «destructive» de Biblioratum: rojo suave, no relleno. */
	.btn-eliminar {
		color: var(--destructive);
		background: var(--destructive-soft);
		border: 1px solid transparent;
	}

	.btn-eliminar:hover:not(:disabled) {
		background: var(--destructive-soft-hover);
	}

	.btn-cancelar:disabled,
	.btn-eliminar:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
