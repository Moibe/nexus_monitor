<script lang="ts">
	// Modal para retirar una cuenta de ORGANIZACIÓN (las que aparecen bajo cada superadmin), hermano de `ModalRetirarAdmin`: mismo molde,
	// mismo motivo obligatorio. Lo que agrega es la advertencia EN ROJO cuando la cuenta es el único administrador activo de alguna
	// organización (Moibe, 2026-11-20: «hazlo con la advertencia en rojo»): esa organización se queda sin administrador. Se puede
	// retirar igual; la advertencia es lo que hace que sea a propósito. Lo dice nexus_back (`GET /admins-plataforma/cuentas/{guid}`)
	// al abrir el modal, y el botón no se habilita hasta tener su respuesta.
	import type { CuentaCreada, CuentaOrganizacion } from '$lib/server/nexusBack';

	let {
		cuenta,
		detalle,
		cargando,
		retirando,
		error,
		onConfirmar,
		onCancelar
	}: {
		cuenta: CuentaCreada | null;
		detalle: CuentaOrganizacion | null;
		cargando: boolean;
		retirando: boolean;
		error: string | null;
		onConfirmar: (motivo: string, dejarSinAdmin: boolean) => void;
		onCancelar: () => void;
	} = $props();

	let motivo = $state('');

	// Se limpia cada vez que se abre, para la misma cuenta o para otra.
	$effect(() => {
		cuenta;
		motivo = '';
	});

	const sinAdmin = $derived(detalle?.organizacionesSinAdmin ?? []);
	const nombreOrg = (o: { guid: string; nombre: string | null }) => o.nombre ?? 'Una organización que ya no existe';
	let listo = $derived(cuenta !== null && detalle !== null && !cargando && motivo.trim().length > 0);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !retirando) onCancelar();
	}

	function handleOverlayClick() {
		if (!retirando) onCancelar();
	}
</script>

<svelte:window onkeydown={cuenta ? handleKeydown : undefined} />

{#if cuenta}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="overlay" data-testid="modal-retirar-cuenta" onclick={handleOverlayClick}>
		<div
			class="modal"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="titulo-retirar-cuenta"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 id="titulo-retirar-cuenta">Retirar cuenta</h2>

			<p class="detalle">
				<strong>{cuenta.nombre ? `${cuenta.nombre} ${cuenta.apellidos ?? ''}` : (cuenta.email ?? '—')}</strong>
				{#if cuenta.email}<code>{cuenta.email}</code>{/if}
			</p>

			{#if detalle && detalle.membresias.length}
				<ul class="membresias" data-testid="membresias-cuenta">
					{#each detalle.membresias as m (m.organizacion.guid)}
						<li><span>{nombreOrg(m.organizacion)}</span> <span class="rol">{m.rolNombre}</span></li>
					{/each}
				</ul>
			{/if}

			{#if cargando}
				<p class="cargando" data-testid="cargando-cuenta">Revisando sus organizaciones…</p>
			{:else if sinAdmin.length}
				<div class="sin-admin" role="alert" data-testid="advertencia-sin-admin">
					<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
						<path d="M12 9v4" />
						<path d="M12 17h.01" />
					</svg>
					<p>
						{#if sinAdmin.length === 1}
							<strong>{nombreOrg(sinAdmin[0])}</strong> se quedará sin administrador: es el único que tiene. Nadie podrá
							administrarla hasta que se le dé otro.
						{:else}
							Estas organizaciones se quedarán sin administrador, porque es el único que tienen:
							<strong>{sinAdmin.map(nombreOrg).join(', ')}</strong>. Nadie podrá administrarlas hasta que se les dé otro.
						{/if}
					</p>
				</div>
			{/if}

			<p class="advertencia">
				Se le cierran las sesiones y <strong>deja de poder entrar</strong>. Su correo queda libre para darse de alta otra vez. Desde
				aquí no se puede deshacer.
			</p>

			<label class="campo">
				Motivo (queda en la bitácora)
				<input
					type="text"
					data-testid="motivo-retiro-cuenta"
					bind:value={motivo}
					placeholder="Por ejemplo: ya no trabaja aquí"
					maxlength={500}
					disabled={retirando}
					autocomplete="off"
				/>
			</label>

			{#if error}
				<p class="error" data-testid="error-retiro-cuenta">{error}</p>
			{/if}

			<div class="botones">
				<button type="button" class="btn-cancelar" data-testid="cancelar-retiro-cuenta" onclick={onCancelar} disabled={retirando}>
					Cancelar
				</button>
				<button
					type="button"
					class="btn-retirar"
					data-testid="confirmar-retiro-cuenta"
					disabled={!listo || retirando}
					onclick={() => onConfirmar(motivo.trim(), sinAdmin.length > 0)}
				>
					{retirando ? 'Retirando…' : sinAdmin.length ? 'Retirar de todos modos' : 'Retirar'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* El molde de `ModalRetirarAdmin` (el `AlertDialog` de Biblioratum). */
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

	.membresias {
		list-style: none;
		margin: 0 0 0.75rem;
		padding: 0;
		font-size: 0.8125rem;
	}

	.membresias li {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.3rem 0;
		border-top: 1px solid var(--border);
	}

	.membresias li:last-child {
		border-bottom: 1px solid var(--border);
	}

	.membresias .rol {
		color: var(--muted-foreground);
	}

	.cargando {
		margin: 0 0 1rem;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	/* La advertencia en rojo: los colores de aviso de error de la app, con un ícono para que no se lea como un texto más. */
	.sin-admin {
		display: flex;
		gap: 0.6rem;
		align-items: flex-start;
		margin: 0 0 0.75rem;
		color: var(--aviso-error-texto);
		background: var(--aviso-error-fondo);
		border: 1px solid var(--aviso-error-borde);
		border-radius: var(--radius-lg);
		padding: 0.7rem 0.8rem;
	}

	.sin-admin svg {
		flex-shrink: 0;
		margin-top: 0.1rem;
	}

	.sin-admin p {
		margin: 0;
		font-size: 0.8125rem;
		line-height: 1.5;
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

	.btn-cancelar {
		color: var(--foreground);
		background: var(--card);
		border: 1px solid var(--border);
	}

	.btn-cancelar:hover:not(:disabled) {
		background: var(--muted);
	}

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
