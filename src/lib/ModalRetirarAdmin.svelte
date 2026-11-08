<script lang="ts">
	// Modal propio para retirar a un superadmin: nada de `confirm()` del browser. Pide un MOTIVO escrito, que queda en la bitácora de
	// nexus_back: retirar a alguien es un borrado lógico (sus sesiones se cierran, su correo queda libre y no hay botón para deshacerlo
	// desde aquí), y quien lea la bitácora después necesita saber por qué se hizo.
	import type { AdminPlataforma } from '$lib/server/nexusBack';

	let {
		admin,
		retirando,
		error,
		onConfirmar,
		onCancelar
	}: {
		admin: AdminPlataforma | null;
		retirando: boolean;
		error: string | null;
		onConfirmar: (motivo: string) => void;
		onCancelar: () => void;
	} = $props();

	let motivo = $state('');

	// Se limpia cada vez que se abre, para el mismo o para otro: si no, un segundo retiro arrancaría con el motivo del anterior.
	$effect(() => {
		admin;
		motivo = '';
	});

	let listo = $derived(admin !== null && motivo.trim().length > 0);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !retirando) onCancelar();
	}

	function handleOverlayClick() {
		if (!retirando) onCancelar();
	}
</script>

<svelte:window onkeydown={admin ? handleKeydown : undefined} />

{#if admin}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="overlay" data-testid="modal-retirar" onclick={handleOverlayClick}>
		<div
			class="modal"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="titulo-retirar"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 id="titulo-retirar">Retirar superadmin</h2>

			<p class="detalle">
				<strong>{admin.nombre} {admin.apellidos}</strong>
				<code>{admin.email}</code>
			</p>

			<p class="advertencia">
				Se le cierran las sesiones y <strong>deja de poder entrar</strong>. Su correo queda libre para darse de alta otra vez. Desde
				aquí no se puede deshacer. No se retira al último superadmin activo.
			</p>

			<label class="campo">
				Motivo (queda en la bitácora)
				<input
					type="text"
					data-testid="motivo-retiro"
					bind:value={motivo}
					placeholder="Por ejemplo: ya no trabaja aquí"
					maxlength={500}
					disabled={retirando}
					autocomplete="off"
				/>
			</label>

			{#if error}
				<p class="error" data-testid="error-retiro">{error}</p>
			{/if}

			<div class="botones">
				<button type="button" class="btn-cancelar" data-testid="cancelar-retiro" onclick={onCancelar} disabled={retirando}>
					Cancelar
				</button>
				<button
					type="button"
					class="btn-retirar"
					data-testid="confirmar-retiro"
					disabled={!listo || retirando}
					onclick={() => onConfirmar(motivo.trim())}
				>
					{retirando ? 'Retirando…' : 'Retirar'}
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
	.btn-retirar {
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
	.btn-retirar {
		color: var(--destructive);
		background: var(--destructive-soft);
		border: 1px solid transparent;
	}

	.btn-retirar:hover:not(:disabled) {
		background: var(--destructive-soft-hover);
	}

	.btn-cancelar:disabled,
	.btn-retirar:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
