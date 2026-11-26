<script lang="ts">
	// Confirma antes de restablecer una contraseña (Moibe, 2026-11-26: «podría poder ver los passwords de las cuentas con un ojito por si ya
	// las olvidé?»). Verla no se puede: nexus_back solo guarda un hash. Restablecer la REEMPLAZA, y eso le cambia las cosas a la persona
	// (su contraseña deja de servir y se le cierran las sesiones), por eso se pregunta primero. Modal propio, nada de `confirm()`.
	type Persona = { nombre: string | null; apellidos: string | null; email: string };

	let {
		persona,
		restableciendo,
		error,
		onConfirmar,
		onCancelar
	}: {
		persona: Persona | null;
		restableciendo: boolean;
		error: string | null;
		onConfirmar: () => void;
		onCancelar: () => void;
	} = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !restableciendo) onCancelar();
	}

	function handleOverlayClick() {
		if (!restableciendo) onCancelar();
	}
</script>

<svelte:window onkeydown={persona ? handleKeydown : undefined} />

{#if persona}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="overlay" data-testid="modal-restablecer" onclick={handleOverlayClick}>
		<div
			class="modal"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="titulo-restablecer"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 id="titulo-restablecer">Restablecer contraseña</h2>

			<p class="detalle">
				{#if persona.nombre}<strong>{persona.nombre} {persona.apellidos ?? ''}</strong>{/if}
				<code>{persona.email}</code>
			</p>

			<p class="explica">
				La contraseña que tiene no se puede ver: nexus_back no la guarda, solo una huella de ella. Lo que sí se puede es
				<strong>reemplazarla por una temporal</strong>, que verás una sola vez.
			</p>

			<p class="advertencia">
				La que tiene <strong>deja de servir</strong> y se le cierran las sesiones abiertas. Al entrar con la temporal tendrá que poner una
				propia. No se le manda correo.
			</p>

			{#if error}
				<p class="error" data-testid="error-restablecer">{error}</p>
			{/if}

			<div class="botones">
				<button type="button" class="btn-cancelar" data-testid="cancelar-restablecer" onclick={onCancelar} disabled={restableciendo}>
					Cancelar
				</button>
				<button type="button" class="btn-confirmar" data-testid="confirmar-restablecer" disabled={restableciendo} onclick={onConfirmar}>
					{restableciendo ? 'Restableciendo…' : 'Restablecer'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* El mismo molde que ModalRetirarAdmin (el `AlertDialog` de Biblioratum); el botón de confirmar es el azul, no el rojo: no se borra nada. */
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

	.explica {
		margin: 0 0 0.75rem;
		font-size: 0.8125rem;
		line-height: 1.5;
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
	.btn-confirmar {
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

	/* El primario de Biblioratum (como «Entendido» del modal de accesos). */
	.btn-confirmar {
		color: var(--primary-foreground);
		background: var(--primary);
		border: 1px solid transparent;
	}

	.btn-confirmar:hover:not(:disabled) {
		background: var(--primary-hover);
	}

	.btn-cancelar:disabled,
	.btn-confirmar:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
