<script lang="ts">
	// Los administradores de plataforma de NexusDoc: crearlos, verlos, regenerarles la contraseña a quien no alcanzó a entrar y retirarlos.
	// Es lo que antes se hacía con tres scripts en una terminal del servidor del back; vive aquí porque es trabajo de quien OPERA el sistema,
	// no algo que se haga desde la plataforma misma.
	//
	// ⚠️ Sin protección extra (decisión del usuario, 2026-10-20): Monitor no tiene login y estas acciones solo piden la llave de servicio
	// que Monitor ya trae. Por eso arriba se dice a qué nexus_back se está hablando: crear una cuenta en el ambiente equivocado no se nota.
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import type { AccesoNuevo, AdminPlataforma, CuentaCreada } from '$lib/server/nexusBack';
	import { formatFecha } from '$lib/procesadores';
	import ModalAcceso from '$lib/ModalAcceso.svelte';
	import ModalRetirarAdmin from '$lib/ModalRetirarAdmin.svelte';

	let { data }: { data: PageData } = $props();

	let nombre = $state('');
	let apellidos = $state('');
	let email = $state('');
	let enviarCorreo = $state(true);
	let creando = $state(false);
	let errorCrear = $state<string | null>(null);

	/** Lo que se le enseña a quien opera una sola vez: los accesos de la cuenta que se acaba de crear o regenerar. */
	let acceso = $state<{ titulo: string; datos: AccesoNuevo } | null>(null);

	let errorFila = $state<string | null>(null);
	let regenerando = $state<string | null>(null);

	let aRetirar = $state<AdminPlataforma | null>(null);
	let retirando = $state(false);
	let errorRetirar = $state<string | null>(null);

	async function mensajeDe(r: Response, defecto: string): Promise<string> {
		const cuerpo = await r.json().catch(() => null);
		return (cuerpo?.message as string | undefined) ?? defecto;
	}

	async function crear(e: SubmitEvent) {
		e.preventDefault();
		creando = true;
		errorCrear = null;
		try {
			const r = await fetch(`/api/${data.ambiente}/superadmins`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, nombre, apellidos, enviarCorreo })
			});
			if (!r.ok) {
				errorCrear = await mensajeDe(r, `Error ${r.status} al crear el superadmin.`);
				return;
			}
			acceso = { titulo: 'Superadmin creado', datos: (await r.json()) as AccesoNuevo };
			nombre = '';
			apellidos = '';
			email = '';
			await invalidateAll();
		} catch {
			errorCrear = 'No se pudo contactar a Monitor.';
		} finally {
			creando = false;
		}
	}

	async function regenerar(a: AdminPlataforma) {
		regenerando = a.guid;
		errorFila = null;
		try {
			const r = await fetch(`/api/${data.ambiente}/superadmins/${encodeURIComponent(a.guid)}/reenviar`, { method: 'POST' });
			if (!r.ok) {
				errorFila = await mensajeDe(r, `Error ${r.status} al regenerar la contraseña.`);
				return;
			}
			acceso = { titulo: 'Contraseña nueva', datos: (await r.json()) as AccesoNuevo };
			await invalidateAll();
		} catch {
			errorFila = 'No se pudo contactar a Monitor.';
		} finally {
			regenerando = null;
		}
	}

	function pedirRetirar(a: AdminPlataforma) {
		aRetirar = a;
		errorRetirar = null;
	}

	function cancelarRetirar() {
		aRetirar = null;
		errorRetirar = null;
	}

	async function confirmarRetirar(motivo: string) {
		if (!aRetirar) return;
		retirando = true;
		errorRetirar = null;
		try {
			const r = await fetch(`/api/${data.ambiente}/superadmins/${encodeURIComponent(aRetirar.guid)}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ motivo })
			});
			if (!r.ok) {
				errorRetirar = await mensajeDe(r, `Error ${r.status} al retirar.`);
				return;
			}
			aRetirar = null;
			await invalidateAll();
		} catch {
			errorRetirar = 'No se pudo contactar a Monitor.';
		} finally {
			retirando = false;
		}
	}

	// ── Refresco automático ─────────────────────────────────────────────────
	//
	// Los cambios propios ya se ven solos (cada acción llama a `invalidateAll`).
	// Lo que no se veía es lo que hace OTRA persona: alguien entra por primera
	// vez y aquí seguía diciendo "Pendiente" hasta recargar a mano.
	//
	// Se resuelve con sondeo y no con SSE/WebSocket a propósito: son unas pocas
	// filas que mira quien opera de vez en cuando, y un stream obligaría a que
	// nexus_back publicara eventos — mucho trabajo para lo que se gana.
	const CADA_MS = 15_000;

	/** Mientras hay un modal abierto o una acción en curso NO se refresca: la
	 *  lista cambiaría debajo de las manos de quien opera, y el modal de accesos
	 *  enseña una contraseña que solo se ve una vez. */
	let ocupado = $derived(
		acceso !== null || aRetirar !== null || creando || retirando || regenerando !== null
	);

	async function refrescar() {
		if (ocupado || document.hidden) return;
		try {
			await invalidateAll();
		} catch {
			// Un sondeo que falla no molesta a quien opera: el siguiente reintenta.
		}
	}

	onMount(() => {
		const timer = setInterval(refrescar, CADA_MS);
		// Al volver a la pestaña se refresca en el acto: es justo cuando más se
		// nota el desfase (estuviste en el correo mientras el otro entraba).
		const alVolver = () => {
			if (!document.hidden) refrescar();
		};
		document.addEventListener('visibilitychange', alVolver);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', alVolver);
		};
	});

	const ETIQUETA_ESTADO: Record<CuentaCreada['estado'], string> = {
		pendiente: 'Pendiente',
		activo: 'Activo',
		inactivo: 'Inactivo',
		retirado: 'Retirado'
	};
	const AYUDA_ESTADO: Record<CuentaCreada['estado'], string> = {
		pendiente: 'Todavía no ha hecho su primer acceso con la contraseña temporal.',
		activo: 'Ya hizo su primer acceso.',
		inactivo: 'La cuenta está desactivada: no puede entrar.',
		retirado: 'La cuenta se retiró; queda aquí porque la creó este superadmin.'
	};

	// ── Desplegable: las cuentas que creó cada superadmin ───────────────────
	//
	// Qué filas están abiertas se guarda por guid, para que el refresco automático no las cierre.
	const abiertos = new SvelteSet<string>();

	function alternar(guid: string) {
		if (abiertos.has(guid)) abiertos.delete(guid);
		else abiertos.add(guid);
	}

	const ETIQUETA_ROL: Record<string, string> = { ADMIN: 'Admin de organización', ADMIN_PLATAFORMA: 'Superadmin' };
	const rolDe = (rol: string | null) => (rol ? (ETIQUETA_ROL[rol] ?? rol) : '—');

	/** Cuántos administradores creó (de organización o de plataforma; otros roles no cuentan). */
	const adminsCreados = (a: AdminPlataforma) =>
		(a.creados ?? []).filter((c) => c.rol === 'ADMIN' || c.rol === 'ADMIN_PLATAFORMA').length;
</script>

<div class="superadmins">
	<div class="cabecera">
		<h1>Superadmins</h1>
		{#if !data.error}
			<span class="total" data-testid="total-superadmins">{data.administradores.length}</span>
		{/if}
	</div>

	<p class="destino" data-testid="destino">
		{#if data.destino}
			Se crean y se retiran en el nexus_back de <code>{data.destino}</code>.
			<span class="auto">La lista se actualiza sola; no hace falta recargar.</span>
		{:else}
			<span class="sin-destino">Este Monitor no tiene NEXUS_API_URL: no sabe con qué nexus_back hablar.</span>
		{/if}
	</p>

	{#if data.error}
		<p class="error" data-testid="error-lista">{data.error}</p>
	{:else}
		<form class="nuevo" onsubmit={crear} data-testid="formulario-nuevo">
			<h2>Nuevo superadmin</h2>
			<div class="campos">
				<label>
					Nombre
					<input type="text" data-testid="campo-nombre" bind:value={nombre} required maxlength={100} autocomplete="off" disabled={creando} />
				</label>
				<label>
					Apellidos
					<input type="text" data-testid="campo-apellidos" bind:value={apellidos} required maxlength={100} autocomplete="off" disabled={creando} />
				</label>
				<label class="ancho">
					Correo
					<input type="email" data-testid="campo-email" bind:value={email} required maxlength={200} autocomplete="off" disabled={creando} />
				</label>
			</div>
			<label class="casilla">
				<input type="checkbox" data-testid="campo-enviar-correo" bind:checked={enviarCorreo} disabled={creando} />
				Mandarle el correo de bienvenida con sus accesos
			</label>
			{#if errorCrear}
				<p class="error" data-testid="error-crear">{errorCrear}</p>
			{/if}
			<div class="acciones-form">
				<button type="submit" class="btn-crear" data-testid="crear-superadmin" disabled={creando}>
					{creando ? 'Creando…' : 'Crear superadmin'}
				</button>
			</div>
		</form>

		{#if errorFila}
			<p class="error" data-testid="error-fila">{errorFila}</p>
		{/if}

		{#if data.administradores.length === 0}
			<p class="vacio">Todavía no hay superadmins.</p>
		{:else}
			<div class="tabla-wrap">
				<table class="tabla-superadmins">
					<thead>
						<tr>
							<th class="col-flecha"><span class="sr-only">Desplegar</span></th>
							<th class="col-nombre">Nombre</th>
							<th>Correo</th>
							<th>Estado</th>
							<th>Creado</th>
							<th>Último acceso</th>
							<th>Sesión</th>
							<th>Admins creados</th>
							<th class="col-accion"><span class="sr-only">Acciones</span></th>
						</tr>
					</thead>
					<tbody>
						{#each data.administradores as a (a.guid)}
							{@const abierto = abiertos.has(a.guid)}
							<tr class="fila" class:abierta={abierto} data-testid="fila-superadmin" data-email={a.email}>
								<td class="col-flecha">
									<button
										type="button"
										class="flecha"
										class:girada={abierto}
										data-testid="desplegar-superadmin"
										aria-expanded={abierto}
										aria-label={`${abierto ? 'Ocultar' : 'Ver'} las cuentas que creó ${a.nombre} ${a.apellidos}`}
										onclick={() => alternar(a.guid)}
									>
										<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
									</button>
								</td>
								<td class="col-nombre">{a.nombre} {a.apellidos}</td>
								<td><code class="correo">{a.email}</code></td>
								<td>
									<span class="estado {a.estado}" data-testid="estado-superadmin" data-estado={a.estado} title={AYUDA_ESTADO[a.estado]}>
										{ETIQUETA_ESTADO[a.estado]}
									</span>
								</td>
								<td>{a.creadoEn ? formatFecha(a.creadoEn) : '—'}</td>
								<td>{a.ultimoLoginEn ? formatFecha(a.ultimoLoginEn) : '—'}</td>
								<td>
									{#if a.sesionActiva}
										<span class="sesion abierta" data-testid="sesion-superadmin">Abierta</span>
									{:else}
										<span class="sesion">—</span>
									{/if}
								</td>
								<td>
									{#if a.creados === undefined}
										<span class="sesion" title="Este nexus_back todavía no informa quién creó a quién.">—</span>
									{:else if adminsCreados(a) > 0}
										<span class="creados si" data-testid="admins-creados">{adminsCreados(a)}</span>
									{:else}
										<span class="creados" data-testid="admins-creados">Ninguno</span>
									{/if}
								</td>
								<td class="col-accion">
									{#if a.estado === 'pendiente'}
										<button
											type="button"
											class="regenerar"
											data-testid="regenerar-superadmin"
											title="Genera una contraseña temporal nueva; la anterior deja de servir."
											disabled={regenerando === a.guid}
											onclick={() => regenerar(a)}
										>
											{regenerando === a.guid ? 'Regenerando…' : 'Regenerar contraseña'}
										</button>
									{/if}
									<button
										type="button"
										class="retirar"
										data-testid="retirar-superadmin"
										aria-label={`Retirar a ${a.nombre} ${a.apellidos}`}
										onclick={() => pedirRetirar(a)}
									>
										Retirar
									</button>
								</td>
							</tr>
							{#if abierto}
								<tr class="detalle" data-testid="detalle-superadmin">
									<td></td>
									<td colspan="8">
										{#if a.creados === undefined}
											<p class="nota">El nexus_back de este ambiente todavía no informa quién creó a quién; aparecerá cuando tenga la versión nueva.</p>
										{:else if a.creados.length === 0}
											<p class="nota">No ha creado ninguna cuenta.</p>
										{:else}
											<table class="tabla-creados">
												<thead>
													<tr>
														<th>Nombre</th>
														<th>Correo</th>
														<th>Rol</th>
														<th>Organización</th>
														<th>Estado</th>
														<th>Creado</th>
													</tr>
												</thead>
												<tbody>
													{#each a.creados as c (c.guid)}
														<tr data-testid="cuenta-creada">
															<td>{c.nombre ? `${c.nombre} ${c.apellidos ?? ''}` : '—'}</td>
															<td>{#if c.email}<code class="correo">{c.email}</code>{:else}—{/if}</td>
															<td>{rolDe(c.rol)}</td>
															<td>{c.organizacion ? (c.organizacion.nombre ?? 'Ya no existe') : '—'}</td>
															<td>
																<span class="estado {c.estado}" title={AYUDA_ESTADO[c.estado]}>{ETIQUETA_ESTADO[c.estado]}</span>
															</td>
															<td>{c.creadoEn ? formatFecha(c.creadoEn) : '—'}</td>
														</tr>
													{/each}
												</tbody>
											</table>
										{/if}
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}

	<ModalAcceso titulo={acceso?.titulo ?? ''} acceso={acceso?.datos ?? null} onCerrar={() => (acceso = null)} />

	<ModalRetirarAdmin admin={aRetirar} {retirando} error={errorRetirar} onConfirmar={confirmarRetirar} onCancelar={cancelarRetirar} />
</div>

<style>
	.superadmins {
		padding: 1.5rem 0.5rem 2.5rem;
	}

	.cabecera {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.cabecera h1 {
		font-size: 1.4rem;
		margin: 0;
	}

	.total {
		font-size: 0.85rem;
		color: #6b7280;
		background: rgba(37, 99, 235, 0.08);
		border: 1px solid rgba(37, 99, 235, 0.18);
		border-radius: 999px;
		padding: 0.15rem 0.65rem;
	}

	.destino {
		font-size: 0.8rem;
		color: #6b7280;
		margin: 0 0 1.25rem;
	}

	.destino .auto {
		color: #9ca3af;
	}

	.destino code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		color: #374151;
	}

	.sin-destino {
		color: #92400e;
	}

	.error {
		color: #b91c1c;
		background: rgba(185, 28, 28, 0.06);
		border: 1px solid rgba(185, 28, 28, 0.2);
		border-radius: 10px;
		padding: 0.75rem 1rem;
		margin: 0 0 1rem;
	}

	.vacio {
		color: #6b7280;
	}

	.nuevo {
		margin: 0 0 1.5rem;
		padding: 1rem 1.1rem 1.1rem;
		background: rgba(17, 24, 39, 0.02);
		border: 1px solid rgba(17, 24, 39, 0.08);
		border-radius: 12px;
	}

	.nuevo h2 {
		margin: 0 0 0.75rem;
		font-size: 0.95rem;
	}

	.campos {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.7rem;
		margin-bottom: 0.75rem;
	}

	.campos label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.78rem;
		color: #6b7280;
	}

	.campos .ancho {
		grid-column: 1 / -1;
	}

	.campos input {
		font: inherit;
		font-size: 0.9rem;
		color: #1f2937;
		background: #ffffff;
		border: 1px solid rgba(17, 24, 39, 0.15);
		border-radius: 8px;
		padding: 0.5rem 0.65rem;
	}

	.campos input:focus {
		outline: 2px solid rgba(37, 99, 235, 0.4);
		outline-offset: 1px;
	}

	.casilla {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.84rem;
		color: #374151;
		margin-bottom: 0.75rem;
	}

	.acciones-form {
		display: flex;
		justify-content: flex-end;
	}

	.btn-crear {
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

	.btn-crear:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.btn-crear:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.tabla-wrap {
		overflow-x: auto;
	}

	.tabla-superadmins {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.tabla-superadmins thead th {
		text-align: left;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: #6b7280;
		padding: 0.5rem 0.65rem;
		border-bottom: 1px solid rgba(17, 24, 39, 0.1);
	}

	.fila td {
		padding: 0.6rem 0.65rem;
		border-bottom: 1px solid rgba(17, 24, 39, 0.06);
		vertical-align: middle;
	}

	.col-nombre {
		font-weight: 600;
	}

	.col-flecha {
		width: 1.75rem;
	}

	.fila td.col-flecha {
		padding-right: 0;
	}

	.flecha {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		color: #6b7280;
		background: none;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: transform 0.15s ease;
	}

	.flecha:hover {
		color: #1f2937;
		background: rgba(17, 24, 39, 0.06);
	}

	.flecha.girada {
		transform: rotate(90deg);
	}

	.fila.abierta td {
		border-bottom-color: transparent;
	}

	.creados {
		font-size: 0.78rem;
		color: #9ca3af;
	}

	.creados.si {
		font-weight: 600;
		color: #1d4ed8;
		background: rgba(37, 99, 235, 0.08);
		border: 1px solid rgba(37, 99, 235, 0.18);
		border-radius: 999px;
		padding: 0.05rem 0.55rem;
	}

	.detalle td {
		padding: 0 0.65rem 0.9rem;
		border-bottom: 1px solid rgba(17, 24, 39, 0.06);
	}

	.detalle .nota {
		margin: 0;
		font-size: 0.8rem;
		color: #6b7280;
	}

	.tabla-creados {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8rem;
		background: rgba(17, 24, 39, 0.02);
		border: 1px solid rgba(17, 24, 39, 0.08);
	}

	.tabla-creados th {
		text-align: left;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: #6b7280;
		padding: 0.4rem 0.6rem;
		border-bottom: 1px solid rgba(17, 24, 39, 0.08);
	}

	.tabla-creados td {
		padding: 0.4rem 0.6rem;
		border-bottom: 1px solid rgba(17, 24, 39, 0.05);
	}

	.tabla-creados tbody tr:last-child td {
		border-bottom: none;
	}

	.estado.retirado {
		color: #9ca3af;
		background: rgba(156, 163, 175, 0.12);
		text-decoration: line-through;
	}

	.col-accion {
		text-align: right;
		white-space: nowrap;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
	}

	.correo {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.8rem;
		color: #4b5563;
	}

	.estado {
		font-size: 0.72rem;
		font-weight: 600;
		border-radius: 6px;
		padding: 0.1rem 0.45rem;
		white-space: nowrap;
	}

	.estado.activo {
		color: #15803d;
		background: rgba(21, 128, 61, 0.1);
	}

	.estado.pendiente {
		color: #b45309;
		background: rgba(180, 83, 9, 0.1);
	}

	.estado.inactivo {
		color: #6b7280;
		background: rgba(107, 114, 128, 0.12);
	}

	.sesion {
		font-size: 0.78rem;
		color: #9ca3af;
	}

	.sesion.abierta {
		color: #15803d;
		font-weight: 600;
	}

	.regenerar,
	.retirar {
		font: inherit;
		font-size: 0.78rem;
		border-radius: 6px;
		padding: 0.25rem 0.6rem;
		cursor: pointer;
		margin-left: 0.35rem;
	}

	.regenerar {
		color: #1d4ed8;
		background: rgba(37, 99, 235, 0.06);
		border: 1px solid rgba(37, 99, 235, 0.22);
	}

	.regenerar:hover:not(:disabled) {
		background: rgba(37, 99, 235, 0.14);
	}

	.regenerar:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.retirar {
		color: #b91c1c;
		background: rgba(185, 28, 28, 0.05);
		border: 1px solid rgba(185, 28, 28, 0.2);
	}

	.retirar:hover {
		background: rgba(185, 28, 28, 0.12);
	}
</style>
