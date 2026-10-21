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
		max-width: 460px;
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

	.persona {
		margin: 0 0 1rem;
		font-size: 0.9rem;
		line-height: 1.6;
	}

	.persona code {
		display: block;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.8rem;
		color: #6b7280;
	}

	.contrasena {
		margin-bottom: 1rem;
	}

	.etiqueta {
		display: block;
		font-size: 0.78rem;
		color: #6b7280;
		margin-bottom: 0.3rem;
	}

	.fila {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.fila code {
		flex: 1;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.95rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: #111827;
		background: rgba(37, 99, 235, 0.06);
		border: 1px solid rgba(37, 99, 235, 0.2);
		border-radius: 8px;
		padding: 0.5rem 0.65rem;
		overflow-wrap: anywhere;
	}

	.btn-copiar {
		font: inherit;
		font-size: 0.8rem;
		color: #1d4ed8;
		background: rgba(37, 99, 235, 0.08);
		border: 1px solid rgba(37, 99, 235, 0.25);
		border-radius: 8px;
		padding: 0.45rem 0.8rem;
		cursor: pointer;
	}

	.btn-copiar:hover {
		background: rgba(37, 99, 235, 0.15);
	}

	.correo {
		margin: 0 0 0.75rem;
		font-size: 0.84rem;
		color: #92400e;
		background: rgba(180, 83, 9, 0.08);
		border: 1px solid rgba(180, 83, 9, 0.22);
		border-radius: 8px;
		padding: 0.55rem 0.75rem;
	}

	.correo.bueno {
		color: #15803d;
		background: rgba(21, 128, 61, 0.08);
		border-color: rgba(21, 128, 61, 0.25);
	}

	.advertencia {
		margin: 0 0 1rem;
		font-size: 0.8rem;
		color: #6b7280;
	}

	.botones {
		display: flex;
		justify-content: flex-end;
	}

	.btn-entendido {
		font: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		color: #ffffff;
		background: #2563eb;
		border: 1px solid #2563eb;
		border-radius: 8px;
		padding: 0.45rem 1.1rem;
		cursor: pointer;
	}

	.btn-entendido:hover {
		background: #1d4ed8;
	}
</style>
