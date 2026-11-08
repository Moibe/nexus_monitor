<script lang="ts">
	import { CAPACIDADES, ESTADOS, GRUPOS, LEIDO_EL, QUIENES, ROLES, type Capacidad } from '$lib/roles';

	// La tabla es estática: lo que dice el código, no lo que contesta un ambiente. No hay nada que preguntarle al back.
	const grupos = (Object.keys(GRUPOS) as Capacidad['grupo'][]).map((grupo) => ({
		grupo,
		...GRUPOS[grupo],
		filas: CAPACIDADES.filter((c) => c.grupo === grupo)
	}));

	// Cuántas columnas ocupa una fila de grupo: el nombre, los siete roles, el administrador de plataforma y el estado.
	const COLUMNAS = 1 + ROLES.length + 1 + 1;
</script>

<div class="roles">
	<header class="cabecera">
		<h1>Roles</h1>
		<span class="total">{ROLES.length} roles + administrador de plataforma</span>
	</header>

	<p class="nota">
		Quién puede <strong>ver</strong> y <strong>hacer</strong> qué en Biblioratum, según el código del {LEIDO_EL} (rama <code>dev</code>;
		staging y producción lo tendrán cuando se promueva). Quien manda es <code>nexus_back</code>: si alguien llega a una pantalla por su
		dirección sin tener el rol, el servidor responde <code>403 sin_permiso</code>; el front solo decide qué se le <em>ofrece</em>.
	</p>

	<div class="tabla-wrap">
		<table class="tabla-roles">
			<thead>
				<tr>
					<th class="col-que">Qué</th>
					{#each ROLES as rol (rol.codigo)}
						<th class="col-rol" title={rol.nombre}>{rol.corto}</th>
					{/each}
					<th class="col-rol col-plataforma" title="Administrador de plataforma">Admin. de plataforma</th>
					<th class="col-estado">Estado de la regla</th>
				</tr>
			</thead>
			<tbody>
				{#each grupos as g (g.grupo)}
					<tr class="fila-grupo">
						<th colspan={COLUMNAS}>
							{g.titulo}
							<span class="grupo-desc">{g.ayuda}</span>
						</th>
					</tr>
					{#each g.filas as c (c.nombre)}
						{@const roles = QUIENES[c.quienes] as readonly string[]}
						<tr class="fila" data-grupo={c.grupo}>
							<td class="col-que">
								<span class="nombre">{c.nombre}</span>
								{#if c.sinPantalla}<span class="sin-pantalla">aún sin pantalla</span>{/if}
								{#if c.detalle}<span class="detalle">{c.detalle}</span>{/if}
								<span class="decide">{c.decide}</span>
							</td>
							{#each ROLES as rol (rol.codigo)}
								{@const si = roles.includes(rol.codigo)}
								<td class="celda" class:si>
									{#if si}
										<span class="marca si" role="img" aria-label="{rol.nombre}: sí">✓</span>
									{:else}
										<span class="marca no" role="img" aria-label="{rol.nombre}: no">—</span>
									{/if}
								</td>
							{/each}
							<td class="celda celda-plataforma si">
								<span class="marca si" role="img" aria-label="Administrador de plataforma: sí">✓</span>
							</td>
							<td class="col-estado">
								<span class="estado {c.estado}" title={ESTADOS[c.estado].ayuda}>{ESTADOS[c.estado].etiqueta}</span>
							</td>
						</tr>
					{/each}
				{/each}
			</tbody>
		</table>
	</div>

	<section class="notas">
		<h2>Cómo leerla</h2>
		<ul>
			<li>
				<strong>Administrador de plataforma</strong> opera en su propio espacio, no dentro de las organizaciones: no entra a los datos de
				una organización aunque ahí diga ✓.
			</li>
			<li>
				La tabla cubre lo que <strong>ya existe</strong>. Lo que el diseño describe para cada rol (cola HITL, alertas PLD, solicitudes ARCO, campos
				sin enmascarar, OT-01 y OT-02 sin descarga…) todavía no está construido, así que no tiene fila.
			</li>
			<li>
				«Propuesta, por confirmar con César» marca lo que está puesto hoy como propuesta de producto; si él decide otra cosa, se cambia en
				<code>roles.py</code> (back), <code>permisos.ts</code> (front) y en <code>src/lib/roles.ts</code> de este proyecto.
				<code>verificar_roles_copias.py</code> compara los tres y falla si dicen cosas distintas.
			</li>
		</ul>
	</section>

	<section class="notas">
		<h2>Los roles, según el diseño (HU07)</h2>
		<dl class="roles-diseno">
			{#each ROLES as rol (rol.codigo)}
				<dt>{rol.nombre} <code>{rol.codigo}</code></dt>
				<dd>{rol.diseno}</dd>
			{/each}
		</dl>
	</section>
</div>

<style>
	/* Una columna con aire parejo entre sus bloques (ver procesadores). */
	.roles {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.cabecera {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.cabecera h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 2rem;
	}

	.total {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--muted-foreground);
		background: var(--muted);
		border-radius: var(--radius-sm);
		padding: 0.125rem 0.5rem;
	}

	.cabecera + .nota {
		margin-top: -1.125rem;
	}

	.nota {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		margin: 0;
		max-width: 80ch;
		line-height: 1.55;
	}

	.nota code,
	.notas code {
		font-family: var(--font-mono);
		font-size: 0.8em;
	}

	/* La tarjeta del listado: la de «Listado de usuarios» de Biblioratum. */
	.tabla-wrap {
		overflow-x: auto;
		background: var(--card);
		border: 2px solid var(--border);
		border-radius: var(--radius-2xl);
		padding: 1.25rem;
	}

	.tabla-roles {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.tabla-roles thead th {
		text-align: center;
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--muted-foreground);
		padding: 0.625rem 0.25rem;
		line-height: 1.25;
		vertical-align: bottom;
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
	}

	.tabla-roles thead th.col-que,
	.tabla-roles thead th.col-estado {
		text-align: left;
		padding-left: 0.5rem;
	}

	.col-rol {
		min-width: 4.3rem;
	}

	.col-plataforma {
		color: var(--muted-foreground);
	}

	.fila-grupo th {
		text-align: left;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--foreground);
		background: var(--muted-soft);
		padding: 0.55rem 0.5rem;
		border-bottom: 1px solid var(--border);
	}

	.grupo-desc {
		font-weight: 400;
		font-size: 0.75rem;
		color: var(--muted-foreground);
		margin-left: 0.5rem;
	}

	.fila td {
		padding: 0.75rem 0.25rem;
		border-bottom: 1px solid var(--border);
		vertical-align: middle;
	}

	.fila td:first-child {
		padding-left: 0.5rem;
	}

	.fila td:last-child {
		padding-right: 0.5rem;
	}

	.col-que {
		min-width: 16rem;
		max-width: 24rem;
	}

	.nombre {
		color: var(--foreground);
		font-weight: 500;
	}

	.detalle {
		display: block;
		font-size: 0.75rem;
		color: var(--muted-foreground);
		margin-top: 0.15rem;
		line-height: 1.4;
	}

	.decide {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		color: var(--muted-foreground);
		opacity: 0.85;
		margin-top: 0.15rem;
	}

	.sin-pantalla {
		margin-left: 0.4rem;
		font-size: 0.68rem;
		font-weight: 500;
		color: var(--warning);
		background: var(--warning-soft);
		border-radius: var(--radius-sm);
		padding: 0.1rem 0.4rem;
		white-space: nowrap;
	}

	.celda {
		text-align: center;
	}

	.celda.si {
		background: rgba(21, 128, 61, 0.035);
	}

	.celda-plataforma {
		border-left: 1px dashed var(--border);
	}

	.marca {
		font-weight: 700;
	}

	.marca.si {
		color: var(--success);
	}

	.marca.no {
		color: #cbd5e1;
		font-weight: 400;
	}

	.col-estado {
		min-width: 9rem;
		max-width: 11rem;
	}

	/* La etiqueta más larga («Propuesta, por confirmar con César») baja de renglón en vez de ensanchar la tabla. */
	.estado {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.3;
		border-radius: var(--radius-sm);
		padding: 0.125rem 0.5rem;
	}

	.estado.abierto {
		color: var(--muted-foreground);
		background: var(--muted);
	}

	.estado.propuesta {
		color: var(--warning);
		background: var(--warning-soft);
	}

	.estado.diseno {
		color: var(--primary-strong);
		background: var(--primary-soft);
	}

	.estado.decision {
		color: var(--success);
		background: var(--success-soft);
	}

	.notas {
		background: var(--card);
		border: 2px solid var(--border);
		border-radius: var(--radius-2xl);
		padding: 1.25rem;
	}

	.notas h2 {
		font-size: 0.875rem;
		font-weight: 500;
		margin: 0 0 0.6rem;
	}

	.notas ul {
		margin: 0;
		padding-left: 1.1rem;
		color: var(--muted-foreground);
		font-size: 0.8125rem;
		line-height: 1.7;
		max-width: 90ch;
	}

	.roles-diseno {
		margin: 0;
		font-size: 0.8125rem;
		line-height: 1.6;
		max-width: 90ch;
	}

	.roles-diseno dt {
		font-weight: 600;
		color: var(--foreground);
		margin-top: 0.75rem;
	}

	.roles-diseno dt:first-child {
		margin-top: 0;
	}

	.roles-diseno dt code {
		font-weight: 400;
		font-size: 0.72rem;
		color: var(--muted-foreground);
		margin-left: 0.3rem;
	}

	.roles-diseno dd {
		margin: 0;
		color: var(--muted-foreground);
	}
</style>
