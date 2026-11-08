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
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(17, 24, 39, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 50;
	}

	.modal {
		width: 100%;
		max-width: 420px;
		background: #ffffff;
		color: #1f2937;
		border: 1px solid rgba(255, 255, 255, 0.9);
		border-radius: 16px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.6),
			0 8px 24px rgba(0, 0, 0, 0.18);
		padding: 1.5rem;
	}

	.modal h2 {
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
	}

	.advertencia {
		margin: 0 0 1rem;
		font-size: 0.85rem;
		color: #b45309;
		background: rgba(180, 83, 9, 0.08);
		border: 1px solid rgba(180, 83, 9, 0.2);
		border-radius: 8px;
		padding: 0.65rem 0.8rem;
	}

	.campo {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.8rem;
		color: #6b7280;
		margin-bottom: 1rem;
	}

	.campo input {
		font: inherit;
		font-size: 0.9rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		color: #1f2937;
		border: 1px solid rgba(17, 24, 39, 0.15);
		border-radius: 8px;
		padding: 0.5rem 0.65rem;
	}

	.campo input:focus {
		outline: 2px solid rgba(37, 99, 235, 0.4);
		outline-offset: 1px;
	}

	.error {
		margin: 0 0 1rem;
		font-size: 0.82rem;
		color: #b91c1c;
		background: rgba(185, 28, 28, 0.06);
		border: 1px solid rgba(185, 28, 28, 0.2);
		border-radius: 8px;
		padding: 0.5rem 0.7rem;
	}

	.botones {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.btn-cancelar,
	.btn-eliminar {
		font: inherit;
		font-size: 0.85rem;
		border-radius: 8px;
		padding: 0.45rem 0.9rem;
		cursor: pointer;
		transition: background 0.15s ease, opacity 0.15s ease;
	}

	.btn-cancelar {
		color: #374151;
		background: rgba(17, 24, 39, 0.04);
		border: 1px solid rgba(17, 24, 39, 0.12);
	}

	.btn-cancelar:hover:not(:disabled) {
		background: rgba(17, 24, 39, 0.08);
	}

	.btn-eliminar {
		color: #ffffff;
		background: #b91c1c;
		border: 1px solid #b91c1c;
		font-weight: 600;
	}

	.btn-eliminar:hover:not(:disabled) {
		background: #991b1b;
	}

	.btn-cancelar:disabled,
	.btn-eliminar:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
