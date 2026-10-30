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
	.roles {
		padding: 1.5rem 0.5rem 2.5rem;
	}

	.cabecera {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 1rem;
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

	.nota {
		font-size: 0.78rem;
		color: #6b7280;
		margin: 0 0 1.5rem;
		max-width: 80ch;
		line-height: 1.5;
	}

	.nota code,
	.notas code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}

	.tabla-wrap {
		overflow-x: auto;
	}

	.tabla-roles {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0 0.3rem;
		font-size: 0.86rem;
	}

	.tabla-roles thead th {
		text-align: center;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #9ca3af;
		padding: 0 0.2rem 0.5rem;
		line-height: 1.25;
		vertical-align: bottom;
	}

	.tabla-roles thead th.col-que,
	.tabla-roles thead th.col-estado {
		text-align: left;
		padding-left: 0.8rem;
	}

	.col-rol {
		min-width: 4.3rem;
	}

	.col-plataforma {
		color: #6b7280;
	}

	.fila-grupo th {
		text-align: left;
		font-size: 0.95rem;
		font-weight: 600;
		color: #374151;
		padding: 0.9rem 0.4rem 0.4rem;
		border-bottom: 1px solid rgba(17, 24, 39, 0.08);
	}

	.fila-grupo:first-child th {
		padding-top: 0.2rem;
	}

	.grupo-desc {
		font-weight: 400;
		font-size: 0.78rem;
		color: #9ca3af;
		margin-left: 0.5rem;
	}

	.fila td {
		padding: 0.55rem 0.2rem;
		border-top: 1px solid rgba(17, 24, 39, 0.06);
		border-bottom: 1px solid rgba(17, 24, 39, 0.06);
		background: rgba(17, 24, 39, 0.015);
		vertical-align: middle;
	}

	.fila td:first-child {
		border-left: 1px solid rgba(17, 24, 39, 0.06);
		border-top-left-radius: 10px;
		border-bottom-left-radius: 10px;
		padding-left: 0.8rem;
	}

	.fila td:last-child {
		border-right: 1px solid rgba(17, 24, 39, 0.06);
		border-top-right-radius: 10px;
		border-bottom-right-radius: 10px;
		padding-right: 0.8rem;
	}

	.col-que {
		min-width: 16rem;
		max-width: 24rem;
	}

	.nombre {
		color: #1f2937;
		font-weight: 500;
	}

	.detalle {
		display: block;
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.15rem;
		line-height: 1.4;
	}

	.decide {
		display: block;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.68rem;
		color: #9ca3af;
		margin-top: 0.15rem;
	}

	.sin-pantalla {
		margin-left: 0.4rem;
		font-size: 0.68rem;
		font-weight: 600;
		color: #92400e;
		background: rgba(180, 83, 9, 0.1);
		border-radius: 6px;
		padding: 0.05rem 0.4rem;
		white-space: nowrap;
	}

	.celda {
		text-align: center;
	}

	.celda.si {
		background: rgba(21, 128, 61, 0.05);
	}

	.celda-plataforma {
		border-left: 1px dashed rgba(17, 24, 39, 0.12);
	}

	.marca {
		font-weight: 700;
	}

	.marca.si {
		color: #15803d;
	}

	.marca.no {
		color: #d1d5db;
		font-weight: 400;
	}

	.col-estado {
		min-width: 9rem;
		max-width: 11rem;
	}

	/* La etiqueta más larga («Propuesta, por confirmar con César») baja de renglón en vez de ensanchar la tabla. */
	.estado {
		display: inline-block;
		font-size: 0.72rem;
		font-weight: 600;
		line-height: 1.3;
		border-radius: 6px;
		padding: 0.1rem 0.4rem;
	}

	.estado.abierto {
		color: #6b7280;
		background: rgba(107, 114, 128, 0.08);
	}

	.estado.propuesta {
		color: #b45309;
		background: rgba(180, 83, 9, 0.1);
	}

	.estado.diseno {
		color: #1d4ed8;
		background: rgba(37, 99, 235, 0.1);
	}

	.estado.decision {
		color: #15803d;
		background: rgba(21, 128, 61, 0.1);
	}

	.notas {
		margin-top: 2rem;
		padding-top: 1.25rem;
		border-top: 1px solid rgba(17, 24, 39, 0.08);
	}

	.notas h2 {
		font-size: 0.95rem;
		font-weight: 600;
		color: #374151;
		margin: 0 0 0.6rem;
	}

	.notas ul {
		margin: 0;
		padding-left: 1.1rem;
		color: #6b7280;
		font-size: 0.82rem;
		line-height: 1.7;
		max-width: 90ch;
	}

	.roles-diseno {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.6;
		max-width: 90ch;
	}

	.roles-diseno dt {
		font-weight: 600;
		color: #374151;
		margin-top: 0.6rem;
	}

	.roles-diseno dt code {
		font-weight: 400;
		font-size: 0.72rem;
		color: #9ca3af;
		margin-left: 0.3rem;
	}

	.roles-diseno dd {
		margin: 0;
		color: #6b7280;
	}
</style>
