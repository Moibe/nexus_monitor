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
		max-width: 440px;
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
	.btn-retirar {
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

	.btn-retirar {
		color: #ffffff;
		background: #b91c1c;
		border: 1px solid #b91c1c;
		font-weight: 600;
	}

	.btn-retirar:hover:not(:disabled) {
		background: #991b1b;
	}

	.btn-cancelar:disabled,
	.btn-retirar:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
