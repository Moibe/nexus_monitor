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

	.detalle {
		margin: 0 0 0.75rem;
		font-size: 0.875rem;
		line-height: 1.6;
	}

	.detalle code {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--muted-foreground);
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
