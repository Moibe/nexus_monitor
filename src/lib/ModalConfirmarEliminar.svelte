<script lang="ts">
	// Modal propio para una acción destructiva e irreversible: nada de
	// `confirm()` del browser. Exige escribir el ID exacto del procesador para
	// habilitar el botón — más fricción de la usual, a propósito: borrar un
	// procesador se lleva su dataset y su esquema, y no hay forma de deshacerlo.
	let {
		procesador,
		eliminando,
		error,
		onConfirmar,
		onCancelar
	}: {
		procesador: { id: string; displayName: string } | null;
		eliminando: boolean;
		error: string | null;
		onConfirmar: () => void;
		onCancelar: () => void;
	} = $props();

	let textoConfirmacion = $state('');

	// Limpia el texto escrito cada vez que se abre (para el mismo procesador o
	// para uno distinto) — si no, un segundo intento sobre otro procesador
	// arrancaría con el ID del anterior ya "coincidiendo".
	$effect(() => {
		procesador;
		textoConfirmacion = '';
	});

	let coincide = $derived(procesador !== null && textoConfirmacion.trim() === procesador.id);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !eliminando) onCancelar();
	}

	function handleOverlayClick() {
		if (!eliminando) onCancelar();
	}
</script>

<svelte:window onkeydown={procesador ? handleKeydown : undefined} />

{#if procesador}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="overlay" onclick={handleOverlayClick}>
		<div
			class="modal"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="titulo-eliminar"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 id="titulo-eliminar">Eliminar procesador</h2>

			<p class="detalle">
				<strong>{procesador.displayName}</strong>
				<code>{procesador.id}</code>
			</p>

			<p class="advertencia">
				Esta acción es <strong>irreversible</strong>: se elimina el procesador junto con su dataset
				y su esquema. Si NexusDoc todavía lo usa, dejará de funcionar.
			</p>

			<label class="campo">
				Escribe el ID de arriba para confirmar
				<input
					type="text"
					bind:value={textoConfirmacion}
					placeholder={procesador.id}
					disabled={eliminando}
					autocomplete="off"
					spellcheck="false"
				/>
			</label>

			{#if error}
				<p class="error">{error}</p>
			{/if}

			<div class="botones">
				<button type="button" class="btn-cancelar" onclick={onCancelar} disabled={eliminando}>
					Cancelar
				</button>
				<button
					type="button"
					class="btn-eliminar"
					disabled={!coincide || eliminando}
					onclick={onConfirmar}
				>
					{eliminando ? 'Eliminando…' : 'Eliminar definitivamente'}
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

	.detalle {
		margin: 0 0 0.75rem;
		font-size: 0.9rem;
		line-height: 1.6;
	}

	.detalle code {
		display: block;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.8rem;
		color: #6b7280;
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
