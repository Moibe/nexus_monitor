<script lang="ts">
	// «Datos»: lo que Document AI leyó de cada documento (Moibe, 2026-11-11). Dos miradas sobre lo mismo:
	//   Documentos — uno por renglón, con su confianza y cuántos de sus campos salieron; al abrirlo, su ficha (FichaDocumento).
	//   Por tipo documental — cómo le va a cada campo de cada tipo: cuántas veces sale, cuánto falta, con qué confianza. Sirve para
	//   afinar tipos y no enseña a ninguna persona.
	// En producción los valores llegan ya enmascarados del servidor (ver `lib/server/enmascarar.ts`).
	import { page } from '$app/state';
	import { formatFecha } from '$lib/procesadores';
	import { ETIQUETA_ESTADO, etiquetaDe, nivelDe, type DocumentoResumen, type Org } from '$lib/datos';
	import FichaDocumento from '$lib/FichaDocumento.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const ambiente = $derived(page.params.ambiente ?? 'dev');
	let vista = $state<'documentos' | 'tipos'>('documentos');
	let filtroOrg = $state('');
	let filtroTipo = $state('');
	let busqueda = $state('');
	let abierto = $state<string | null>(null);

	const p = $derived(data.panorama);
	const nombreOrg = (o: Org) => o.nombre ?? `${o.guid.slice(0, 8)}…`;

	const organizaciones = $derived.by(() => {
		const m = new Map<string, Org>();
		for (const d of p?.documentos ?? []) m.set(d.organizacion.guid, d.organizacion);
		for (const t of p?.tipos ?? []) m.set(t.organizacion.guid, t.organizacion);
		return [...m.values()].sort((a, b) => nombreOrg(a).localeCompare(nombreOrg(b), 'es'));
	});

	const tiposDisponibles = $derived.by(() => {
		const s = new Set<string>();
		for (const d of p?.documentos ?? []) if (!filtroOrg || d.organizacion.guid === filtroOrg) s.add(d.tipoDocumental.nombre ?? d.tipoDocumental.id);
		return [...s].sort((a, b) => a.localeCompare(b, 'es'));
	});

	const documentos = $derived.by(() => {
		const q = busqueda.trim().toLowerCase();
		return (p?.documentos ?? []).filter(
			(d) =>
				(!filtroOrg || d.organizacion.guid === filtroOrg) &&
				(!filtroTipo || (d.tipoDocumental.nombre ?? d.tipoDocumental.id) === filtroTipo) &&
				(!q || d.archivo.toLowerCase().includes(q) || d.id.includes(q))
		);
	});

	const tipos = $derived(
		(p?.tipos ?? []).filter(
			(t) => (!filtroOrg || t.organizacion.guid === filtroOrg) && (!filtroTipo || (t.nombre ?? t.id) === filtroTipo)
		)
	);

	// Las cifras de arriba, sobre lo filtrado.
	const kpi = $derived.by(() => {
		const conf = documentos.map((d) => d.confianzaPromedio).filter((c): c is number => c !== null);
		const campos = documentos.reduce((s, d) => s + d.campos, 0);
		return {
			documentos: documentos.length,
			confianza: conf.length ? conf.reduce((a, b) => a + b, 0) / conf.length : null,
			completitud: campos ? (documentos.reduce((s, d) => s + d.conValor, 0) / campos) * 100 : null,
			ausentes: documentos.reduce((s, d) => s + d.ausentes, 0),
			corregidos: documentos.reduce((s, d) => s + d.corregidos, 0),
			fallidos: documentos.filter((d) => d.estado === 'error').length
		};
	});

	const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n)}%`);
</script>

{#snippet barraConfianza(promedio: number | null, minima: number | null)}
	{#if promedio === null}
		<span class="sin-dato">—</span>
	{:else}
		<span class="barra-conf" title={`Promedio ${Math.round(promedio)}%${minima !== null ? ` · mínima ${Math.round(minima)}%` : ''}`}>
			<span class="pista">
				<span class="relleno {nivelDe(promedio)}" style:width="{promedio}%"></span>
				{#if minima !== null}<span class="marca-min" style:left="{minima}%"></span>{/if}
			</span>
			<span class="num {nivelDe(promedio)}">{Math.round(promedio)}%</span>
		</span>
	{/if}
{/snippet}

{#snippet completitud(d: DocumentoResumen)}
	{#if d.campos === 0}
		<span class="sin-dato">sin campos</span>
	{:else}
		<span class="barra-campos" title={`${d.conValor} con valor · ${d.ausentes} faltaron`}>
			<span class="pista">
				<span class="relleno lleno" style:width="{(d.conValor / d.campos) * 100}%"></span>
				<span class="relleno falta" style:width="{(d.ausentes / d.campos) * 100}%"></span>
			</span>
			<span class="num">{d.conValor}/{d.campos}</span>
		</span>
	{/if}
{/snippet}

<div class="datos">
	<header class="cabecera">
		<h1>Datos extraídos</h1>
		{#if p && !p.sinBase}<span class="total">{p.documentos.length} documentos</span>{/if}
		{#if p?.enmascarado}<span class="enmascarado" title="En producción los valores salen enmascarados">valores enmascarados</span>{/if}
	</header>
	<p class="nota">
		Lo que Document AI leyó de cada documento, de todas las organizaciones de este ambiente: los campos <strong>vigentes</strong> (la última
		extracción que terminó, con las correcciones a mano encima).
	</p>

	{#if data.error}
		<p class="error" data-testid="error-datos">{data.error}</p>
	{:else if p?.sinBase}
		<p class="vacio">El nexus_back de este ambiente no tiene base de datos: no hay datos extraídos que enseñar.</p>
	{:else if p}
		<div class="kpis">
			<div class="kpi">
				<span class="kpi-etq">Documentos</span>
				<strong>{kpi.documentos}</strong>
				{#if kpi.fallidos}<span class="kpi-sub mal">{kpi.fallidos} con la última extracción fallida</span>{/if}
			</div>
			<div class="kpi">
				<span class="kpi-etq">Confianza promedio</span>
				<strong class={nivelDe(kpi.confianza)}>{pct(kpi.confianza)}</strong>
			</div>
			<div class="kpi">
				<span class="kpi-etq">Campos con valor</span>
				<strong>{pct(kpi.completitud)}</strong>
				<span class="kpi-sub">{kpi.ausentes} faltaron</span>
			</div>
			<div class="kpi">
				<span class="kpi-etq">Corregidos a mano</span>
				<strong>{kpi.corregidos}</strong>
			</div>
		</div>

		<div class="listado">
			<div class="barra-herramientas">
				<div class="pestanas" role="tablist">
					<button type="button" role="tab" aria-selected={vista === 'documentos'} class:activa={vista === 'documentos'} onclick={() => (vista = 'documentos')}>
						Documentos
					</button>
					<button type="button" role="tab" aria-selected={vista === 'tipos'} class:activa={vista === 'tipos'} onclick={() => (vista = 'tipos')} data-testid="vista-tipos">
						Por tipo documental
					</button>
				</div>
				<div class="filtros">
					<select bind:value={filtroOrg} onchange={() => (filtroTipo = '')} aria-label="Organización">
						<option value="">Todas las organizaciones</option>
						{#each organizaciones as o (o.guid)}<option value={o.guid}>{nombreOrg(o)}</option>{/each}
					</select>
					<select bind:value={filtroTipo} aria-label="Tipo documental">
						<option value="">Todos los tipos</option>
						{#each tiposDisponibles as t (t)}<option value={t}>{t}</option>{/each}
					</select>
					{#if vista === 'documentos'}
						<input type="search" placeholder="Buscar archivo" bind:value={busqueda} aria-label="Buscar archivo" />
					{/if}
				</div>
			</div>

			{#if vista === 'documentos'}
				{#if documentos.length === 0}
					<p class="vacio">{p.documentos.length === 0 ? 'Todavía no hay documentos extraídos en este ambiente.' : 'Ningún documento coincide con el filtro.'}</p>
				{:else}
					<div class="tabla-wrap">
						<table class="tabla">
							<thead>
								<tr>
									<th>Documento</th>
									<th>Organización</th>
									<th>Tipo documental</th>
									<th>Confianza</th>
									<th>Campos</th>
									<th>Estado</th>
									<th>Extraído</th>
								</tr>
							</thead>
							<tbody>
								{#each documentos as d (d.id)}
									<tr class="fila" class:seleccionada={abierto === d.id} onclick={() => (abierto = d.id)} data-testid="fila-documento">
										<td class="col-doc">
											<button type="button" class="abrir" onclick={(e) => { e.stopPropagation(); abierto = d.id; }}>{d.archivo}</button>
											<span class="sub">
												{d.paginas ? `${d.paginas} pág.` : ''}
												{#if d.corridas > 1}· {d.corridas} extracciones{/if}
												{#if d.corregidos}· <span class="manual">{d.corregidos} corregido{d.corregidos === 1 ? '' : 's'}</span>{/if}
											</span>
										</td>
										<td>{nombreOrg(d.organizacion)}</td>
										<td>{d.tipoDocumental.nombre ?? d.tipoDocumental.id}</td>
										<td>{@render barraConfianza(d.confianzaPromedio, d.confianzaMinima)}</td>
										<td>{@render completitud(d)}</td>
										<td><span class="estado {d.estado}" title={d.error ?? ''}>{ETIQUETA_ESTADO[d.estado]}</span></td>
										<td class="col-fecha">{d.extraidoEn ? formatFecha(d.extraidoEn) : '—'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					{#if p.limite && p.documentos.length >= p.limite}
						<p class="sub pie">Se enseñan los {p.limite} más recientes.</p>
					{/if}
				{/if}
			{:else if tipos.length === 0}
				<p class="vacio">No hay tipos documentales con datos extraídos{filtroOrg || filtroTipo ? ' con ese filtro' : ''}.</p>
			{:else}
				<div class="tipos">
					{#each tipos as t (t.organizacion.guid + t.id)}
						<article class="tipo" data-testid="tarjeta-tipo">
							<header class="tipo-cabeza">
								<div>
									<h2>{t.nombre ?? t.id}</h2>
									<p class="sub">{nombreOrg(t.organizacion)} · {t.documentos} documento{t.documentos === 1 ? '' : 's'} · {t.campos.length} campos</p>
								</div>
								<div class="tipo-conf">{@render barraConfianza(t.confianzaPromedio, null)}</div>
							</header>
							<table class="tabla tabla-tipo">
								<thead>
									<tr>
										<th>Campo</th>
										<th>Sale en</th>
										<th>Confianza</th>
										<th class="num-col">Faltó</th>
										<th class="num-col">A mano</th>
									</tr>
								</thead>
								<tbody>
									{#each t.campos as c (c.ruta)}
										{@const presencia = c.veces ? (c.conValor / c.veces) * 100 : 0}
										<tr>
											<td class="col-campo" title={c.ruta}>{c.ruta.split('.').map((s) => etiquetaDe(s.replace('[]', ''))).join(' › ')}{#if c.ruta.includes('[]')}<span class="repite">se repite</span>{/if}</td>
											<td>
												<span class="barra-campos" title={`${c.conValor} de ${c.veces}`}>
													<span class="pista"><span class="relleno {presencia >= 90 ? 'lleno' : presencia >= 60 ? 'medio' : 'falta'}" style:width="{presencia}%"></span></span>
													<span class="num">{Math.round(presencia)}%</span>
												</span>
											</td>
											<td>{@render barraConfianza(c.confianzaPromedio, c.confianzaMinima)}</td>
											<td class="num-col">{#if c.ausentes}<span class="cuenta-mal">{c.ausentes}</span>{:else}<span class="sin-dato">0</span>{/if}</td>
											<td class="num-col">{#if c.corregidos}<span class="manual">{c.corregidos}</span>{:else}<span class="sin-dato">0</span>{/if}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</article>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<FichaDocumento {ambiente} id={abierto} onCerrar={() => (abierto = null)} />

<style>
	.datos {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.cabecera {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.cabecera h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 2rem;
	}

	.total,
	.enmascarado {
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: var(--radius-sm);
		padding: 0.125rem 0.5rem;
	}

	.total {
		color: var(--muted-foreground);
		background: var(--muted);
	}

	.enmascarado {
		color: var(--warning);
		background: var(--warning-soft);
	}

	.cabecera + .nota {
		margin-top: -1.125rem;
	}

	.nota {
		margin: 0;
		max-width: 80ch;
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	.error {
		margin: 0;
		font-size: 0.875rem;
		color: var(--aviso-error-texto);
		background: var(--aviso-error-fondo);
		border: 1px solid var(--aviso-error-borde);
		border-radius: var(--radius-lg);
		padding: 0.75rem 1rem;
	}

	.vacio {
		margin: 0;
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	/* Las cifras de arriba: cuatro tarjetas. */
	.kpis {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1rem;
	}

	.kpi {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem 1.25rem;
		background: var(--card);
		border: 2px solid var(--border);
		border-radius: var(--radius-2xl);
	}

	.kpi-etq {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.kpi strong {
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.2;
	}

	.kpi strong.alta {
		color: var(--success);
	}
	.kpi strong.media {
		color: var(--warning);
	}
	.kpi strong.baja {
		color: var(--destructive);
	}

	.kpi-sub {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.kpi-sub.mal {
		color: var(--destructive);
	}

	.listado {
		background: var(--card);
		border: 2px solid var(--border);
		border-radius: var(--radius-2xl);
		padding: 1.25rem;
	}

	.barra-herramientas {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.pestanas {
		display: inline-flex;
		gap: 0.25rem;
		padding: 0.25rem;
		background: var(--muted);
		border-radius: var(--radius-lg);
	}

	.pestanas button {
		height: 1.85rem;
		padding: 0 0.85rem;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--muted-foreground);
		background: none;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
	}

	.pestanas button.activa {
		color: var(--foreground);
		background: var(--card);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
	}

	.filtros {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.filtros select,
	.filtros input {
		box-sizing: border-box;
		height: 2rem;
		font: inherit;
		font-size: 0.8125rem;
		color: var(--foreground);
		background: var(--card);
		border: 1px solid var(--input);
		border-radius: var(--radius-md);
		padding: 0 0.6rem;
	}

	.filtros input {
		width: 12rem;
	}

	.filtros select:focus,
	.filtros input:focus {
		outline: none;
		border-color: var(--ring);
		box-shadow: var(--ring-sombra);
	}

	.tabla-wrap {
		overflow-x: auto;
	}

	.tabla {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}

	.tabla thead th {
		text-align: left;
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--muted-foreground);
		padding: 0.625rem 1rem 0.625rem 0.5rem;
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
		white-space: nowrap;
	}

	.tabla td {
		padding: 0.7rem 1rem 0.7rem 0.5rem;
		border-bottom: 1px solid var(--border);
		vertical-align: middle;
	}

	.tabla tbody tr:last-child td {
		border-bottom: none;
	}

	.fila {
		cursor: pointer;
		transition: background 0.12s ease;
	}

	.fila:hover,
	.fila.seleccionada {
		background: var(--muted-soft);
	}

	.col-doc {
		max-width: 22rem;
	}

	.abrir {
		display: block;
		max-width: 100%;
		padding: 0;
		font: inherit;
		font-weight: 500;
		color: var(--foreground);
		text-align: left;
		background: none;
		border: none;
		cursor: pointer;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.abrir:hover {
		color: var(--primary);
	}

	.sub {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.pie {
		margin: 0.75rem 0 0;
	}

	.col-fecha {
		white-space: nowrap;
		color: var(--muted-foreground);
	}

	.sin-dato {
		color: var(--muted-foreground);
	}

	.manual {
		color: var(--primary-strong);
		font-weight: 500;
	}

	/* Barras: confianza (con una rayita en la mínima) y campos (verde lo que salió, ámbar lo que faltó). */
	.barra-conf,
	.barra-campos {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		white-space: nowrap;
	}

	.pista {
		position: relative;
		display: inline-flex;
		width: 5.5rem;
		height: 0.4rem;
		overflow: hidden;
		background: var(--muted);
		border-radius: 999px;
	}

	.relleno {
		height: 100%;
	}

	.relleno.alta,
	.relleno.lleno {
		background: var(--success);
	}
	.relleno.media,
	.relleno.medio {
		background: #d97706;
	}
	.relleno.baja,
	.relleno.falta {
		background: var(--destructive);
	}

	.barra-campos .relleno.falta {
		background: #fbbf24;
	}

	.marca-min {
		position: absolute;
		top: -1px;
		bottom: -1px;
		width: 2px;
		background: var(--foreground);
		opacity: 0.45;
	}

	.num {
		min-width: 2.4rem;
		font-size: 0.75rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--secondary-foreground);
	}

	.num.alta {
		color: var(--success);
	}
	.num.media {
		color: var(--warning);
	}
	.num.baja {
		color: var(--destructive);
	}

	.estado {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: var(--radius-sm);
		padding: 0.125rem 0.5rem;
		white-space: nowrap;
	}

	.estado.ok {
		color: var(--success);
		background: var(--success-soft);
	}
	.estado.no_reconocido {
		color: var(--warning);
		background: var(--warning-soft);
	}
	.estado.error {
		color: var(--destructive);
		background: var(--destructive-soft);
	}

	/* Por tipo documental: una tarjeta por tipo. */
	.tipos {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(34rem, 1fr));
		gap: 1rem;
	}

	.tipo {
		min-width: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		padding: 1rem 1rem 0.5rem;
	}

	.tipo-cabeza {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.tipo h2 {
		margin: 0 0 0.15rem;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.tipo .sub {
		margin: 0;
	}

	.tabla-tipo thead th {
		padding-right: 0.75rem;
	}

	.tabla-tipo td {
		padding: 0.5rem 0.75rem 0.5rem 0.5rem;
	}

	.col-campo {
		font-weight: 500;
	}

	.repite {
		margin-left: 0.4rem;
		font-size: 0.68rem;
		font-weight: 500;
		color: var(--muted-foreground);
		background: var(--muted);
		border-radius: var(--radius-sm);
		padding: 0.05rem 0.35rem;
	}

	.num-col {
		text-align: right;
	}

	.cuenta-mal {
		font-weight: 600;
		color: var(--warning);
	}

	@media (max-width: 900px) {
		.kpis {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.tipos {
			grid-template-columns: 1fr;
		}
	}
</style>
