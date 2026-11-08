<script lang="ts">
	// Muestra UNA VEZ los accesos de un superadmin recién creado, o de uno al que se le regeneró la contraseña. La contraseña temporal
	// no se guarda en ningún lado de Monitor ni de nexus_back (solo su hash), así que si se cierra sin copiarla no hay cómo volver a
	// verla: por eso NO se cierra con Escape ni con un clic fuera, solo con el botón. Es el respaldo de quien opera: si el correo no
	// salió, esta pantalla es la única forma de que la persona entre.
	import { copiarTexto } from '$lib/copiar';
	import type { AccesoNuevo, CorreoDeBienvenida } from '$lib/server/nexusBack';

	let {
		titulo,
		acceso,
		onCerrar
	}: {
		titulo: string;
		acceso: AccesoNuevo | null;
		onCerrar: () => void;
	} = $props();

	let copiado = $state(false);

	// Una contraseña nueva abre este modal otra vez: el aviso de «Copiada» de la anterior no debe heredarse.
	$effect(() => {
		acceso;
		copiado = false;
	});

	async function copiar() {
		if (!acceso) return;
		copiado = await copiarTexto(acceso.contrasenaTemporal);
		if (copiado) setTimeout(() => (copiado = false), 1500);
	}

	// Lo que pasó con el correo, dicho con todas sus letras: «no salió» es lo que el operador tiene que saber para entregar la contraseña.
	const AVISO_DE_CORREO: Record<CorreoDeBienvenida, { texto: string; bueno: boolean }> = {
		enviado: { texto: 'Se le mandó un correo de bienvenida con estos mismos accesos.', bueno: true },
		sin_canal: { texto: 'El correo NO se mandó: este ambiente no manda correo de verdad. Entrégale tú la contraseña.', bueno: false },
		fallo: { texto: 'NO SE PUDO mandar el correo (el motivo está en el log de nexus_back). Entrégale tú la contraseña.', bueno: false },
		omitido: { texto: 'No se mandó correo porque pediste no mandarlo. Entrégale tú la contraseña.', bueno: false }
	};
</script>

{#if acceso}
	<div class="overlay" data-testid="modal-acceso">
		<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="titulo-acceso" tabindex="-1">
			<h2 id="titulo-acceso">{titulo}</h2>

			<p class="persona">
				<strong>{acceso.administrador.nombre} {acceso.administrador.apellidos}</strong>
				<code data-testid="acceso-correo-usuario">{acceso.administrador.email}</code>
			</p>

			<div class="contrasena">
				<span class="etiqueta">Contraseña temporal</span>
				<div class="fila">
					<code data-testid="contrasena-temporal">{acceso.contrasenaTemporal}</code>
					<button type="button" class="btn-copiar" data-testid="copiar-contrasena" onclick={copiar}>
						{copiado ? 'Copiada' : 'Copiar'}
					</button>
				</div>
			</div>

			<p
				class="correo"
				class:bueno={AVISO_DE_CORREO[acceso.correo].bueno}
				data-testid="acceso-correo"
				data-estado={acceso.correo}
			>
				{AVISO_DE_CORREO[acceso.correo].texto}
			</p>

			<p class="advertencia">
				<strong>Se muestra solo esta vez.</strong> No se guarda en ningún lado. Al entrar, la persona tendrá que cambiarla.
			</p>

			<div class="botones">
				<button type="button" class="btn-entendido" data-testid="cerrar-acceso" onclick={onCerrar}>Entendido</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* El molde del `AlertDialog` de Biblioratum (ver ModalConfirmarEliminar). */
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
		max-width: 29rem;
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

	.persona {
		margin: 0 0 1rem;
		font-size: 0.875rem;
		line-height: 1.6;
	}

	.persona code {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--muted-foreground);
	}

	.contrasena {
		margin-bottom: 1rem;
	}

	.etiqueta {
		display: block;
		font-size: 0.75rem;
		color: var(--muted-foreground);
		margin-bottom: 0.3rem;
	}

	.fila {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.fila code {
		flex: 1;
		font-family: var(--font-mono);
		font-size: 0.95rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--foreground);
		background: var(--primary-soft);
		border: 1px solid var(--primary-line);
		border-radius: var(--radius-md);
		padding: 0.5rem 0.65rem;
		overflow-wrap: anywhere;
	}

	/* «outline» de Biblioratum. */
	.btn-copiar {
		height: 2.25rem;
		padding: 0 0.9rem;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--foreground);
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-copiar:hover {
		background: var(--muted);
	}

	.correo {
		margin: 0 0 0.75rem;
		font-size: 0.8125rem;
		color: var(--aviso-atencion-texto);
		background: var(--aviso-atencion-fondo);
		border: 1px solid var(--aviso-atencion-borde);
		border-radius: var(--radius-lg);
		padding: 0.55rem 0.75rem;
	}

	.correo.bueno {
		color: var(--aviso-ok-texto);
		background: var(--aviso-ok-fondo);
		border-color: var(--aviso-ok-borde);
	}

	.advertencia {
		margin: 0 0 1rem;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.botones {
		display: flex;
		justify-content: flex-end;
	}

	.btn-entendido {
		height: 2.25rem;
		padding: 0 1.1rem;
		font: inherit;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--primary-foreground);
		background: var(--primary);
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-entendido:hover {
		background: var(--primary-hover);
	}
</style>
