<script lang="ts">
	// «Datos»: lo que Document AI leyó de cada documento (Moibe, 2026-11-11). Dos miradas sobre lo mismo:
	//   Documentos — uno por renglón, con su confianza y cuántos de sus campos salieron; al abrirlo, su ficha (FichaDocumento).
	//   Por tipo documental — cómo le va a cada campo de cada tipo: cuántas veces sale, cuánto falta, con qué confianza. Sirve para
	//   afinar tipos y no enseña a ninguna persona.
	// En producción los valores llegan ya enmascarados del servidor (ver `lib/server/enmascarar.ts`).
	import { page } from '$app/state';
	import { formatFecha } from '$lib/procesadores';
	import {
		ETIQUETA_ESTADO,
		consultaDe,
		etiquetaDe,
		filtrarDocumentos,
		filtrosDeUrl,
		nivelDe,
		pasaEstadoTipo as pasaEstado,
		type DocumentoResumen,
		type EstadoTipo,
		type OrdenFecha,
		type Org
	} from '$lib/datos';
	import { goto, replaceState } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const ambiente = $derived(page.params.ambiente ?? 'dev');
	let vista = $state<'documentos' | 'tipos'>('documentos');
	// Los filtros y el orden viven en la dirección (`?org=…&tipo=…&estado=…&q=…&orden=…`): al volver de una ficha siguen puestos, y la
	// ficha los usa para sus flechas de anterior y siguiente.
	const inicial = filtrosDeUrl(page.url.searchParams);
	let filtroOrg = $state(inicial.org);
	let filtroTipo = $state(inicial.tipo);
	let busqueda = $state(inicial.q);
	let filtroEstadoTipo = $state<EstadoTipo>(inicial.estado);
	let orden = $state<OrdenFecha>(inicial.orden);
	const filtros = $derived({ org: filtroOrg, tipo: filtroTipo, estado: filtroEstadoTipo, q: busqueda, orden });
	const consulta = $derived(consultaDe(filtros));
	$effect(() => {
		const nueva = `${page.url.pathname}${consulta}`;
		if (nueva !== `${page.url.pathname}${page.url.search}`) {
			try {
				replaceState(nueva, page.state);
			} catch {
				/* el enrutador aún no arranca: la dirección se pone al siguiente cambio */
			}
		}
	});
	// Cada documento abre su ficha en su propia página, con los filtros para que sus flechas recorran lo mismo que se ve aquí.
	const enlace = (id: string) => `/${ambiente}/datos/${id}${consulta}`;

	// Lista o mosaico para «Documentos». Es una comodidad de quien mira: se guarda en este navegador y, si no se puede, arranca en lista.
	const LLAVE_FORMATO = 'monitor.datos.formato';
	let formato = $state<'lista' | 'mosaico'>('lista');
	$effect(() => {
		try {
			if (localStorage.getItem(LLAVE_FORMATO) === 'mosaico') formato = 'mosaico';
		} catch {
			/* sin almacenamiento: se queda en lista */
		}
	});
	function elegirFormato(f: 'lista' | 'mosaico') {
		formato = f;
		try {
			localStorage.setItem(LLAVE_FORMATO, f);
		} catch {
			/* sin almacenamiento: dura lo que la página */
		}
	}

	const pasaEstadoTipo = (existe: boolean | undefined) => pasaEstado(filtroEstadoTipo, existe);

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
		for (const d of p?.documentos ?? [])
			if ((!filtroOrg || d.organizacion.guid === filtroOrg) && pasaEstadoTipo(d.tipoDocumental.existe))
				s.add(d.tipoDocumental.nombre ?? d.tipoDocumental.id);
		return [...s].sort((a, b) => a.localeCompare(b, 'es'));
	});

	const documentos = $derived(filtrarDocumentos(p?.documentos ?? [], filtros));

	const tipos = $derived(
		(p?.tipos ?? []).filter(
			(t) =>
				(!filtroOrg || t.organizacion.guid === filtroOrg) &&
				(!filtroTipo || (t.nombre ?? t.id) === filtroTipo) &&
				pasaEstadoTipo(t.existe)
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
				{#if vista === 'documentos'}
					<!-- Lista o mosaico; se recuerda en este navegador. -->
					<div class="formato" role="group" aria-label="Cómo enseñar los documentos">
						<button type="button" class:activa={formato === 'lista'} aria-pressed={formato === 'lista'} title="Lista" aria-label="Lista" onclick={() => elegirFormato('lista')}>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
						</button>
						<button type="button" class:activa={formato === 'mosaico'} aria-pressed={formato === 'mosaico'} title="Mosaico" aria-label="Mosaico" data-testid="formato-mosaico" onclick={() => elegirFormato('mosaico')}>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
						</button>
					</div>
				{/if}
				<div class="filtros">
					<select bind:value={filtroOrg} onchange={() => (filtroTipo = '')} aria-label="Organización">
						<option value="">Todas las organizaciones</option>
						{#each organizaciones as o (o.guid)}<option value={o.guid}>{nombreOrg(o)}</option>{/each}
					</select>
					<select bind:value={filtroTipo} aria-label="Tipo documental">
						<option value="">Todos los tipos</option>
						{#each tiposDisponibles as t (t)}<option value={t}>{t}</option>{/each}
					</select>
					<select bind:value={filtroEstadoTipo} onchange={() => (filtroTipo = '')} aria-label="Estado del tipo documental" data-testid="filtro-estado-tipo">
						<option value="">Activos e inactivos</option>
						<option value="activo">Solo tipos activos</option>
						<option value="inactivo">Solo tipos inactivos (borrados)</option>
					</select>
					{#if vista === 'documentos'}
						<select bind:value={orden} aria-label="Ordenar por fecha" data-testid="orden-fecha">
							<option value="recientes">Más recientes primero</option>
							<option value="antiguos">Más antiguos primero</option>
						</select>
						<input type="search" placeholder="Buscar archivo" bind:value={busqueda} aria-label="Buscar archivo" />
					{/if}
				</div>
			</div>

			{#if vista === 'documentos'}
				{#if documentos.length === 0}
					<p class="vacio">{p.documentos.length === 0 ? 'Todavía no hay documentos extraídos en este ambiente.' : 'Ningún documento coincide con el filtro.'}</p>
				{:else if formato === 'mosaico'}
					<div class="mosaico">
						{#each documentos as d (d.id)}
							<a
								class="tarjeta-doc"
								class:tipo-borrado={d.tipoDocumental.existe === false}
								href={enlace(d.id)}
								data-testid="tarjeta-documento"
							>
								<span class="tarjeta-top">
									<span class="icono-doc {nivelDe(d.confianzaPromedio)}" aria-hidden="true">
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></svg>
									</span>
									<span class="estado {d.estado}" title={d.error ?? ''}>{ETIQUETA_ESTADO[d.estado]}</span>
								</span>
								<span class="tarjeta-tipo">
									{d.tipoDocumental.nombre ?? d.tipoDocumental.id}
									{#if d.tipoDocumental.existe === false}<span class="borrado">ya no existe</span>{/if}
								</span>
								<span class="tarjeta-archivo" title={d.archivo}>{d.archivo}</span>
								<span class="sub">{nombreOrg(d.organizacion)}</span>
								<span class="tarjeta-barras">
									<span class="tarjeta-fila"><span class="sub">Confianza</span>{@render barraConfianza(d.confianzaPromedio, d.confianzaMinima)}</span>
									<span class="tarjeta-fila"><span class="sub">Campos</span>{@render completitud(d)}</span>
								</span>
								<span class="tarjeta-pie sub">
									{d.extraidoEn ? formatFecha(d.extraidoEn) : '—'}
									{#if d.paginas}· {d.paginas} pág.{/if}
									{#if d.corregidos}· <span class="manual">{d.corregidos} a mano</span>{/if}
								</span>
							</a>
						{/each}
					</div>
					{#if p.limite && p.documentos.length >= p.limite}
						<p class="sub pie">Se enseñan los {p.limite} más recientes.</p>
					{/if}
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
									<th aria-sort={orden === 'recientes' ? 'descending' : 'ascending'}>
										<button
											type="button"
											class="ordenar"
											title={orden === 'recientes' ? 'Poner los más antiguos primero' : 'Poner los más recientes primero'}
											onclick={() => (orden = orden === 'recientes' ? 'antiguos' : 'recientes')}
											data-testid="ordenar-extraido"
										>
											Extraído
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
												<path d={orden === 'recientes' ? 'M12 5v14M19 12l-7 7-7-7' : 'M12 19V5M5 12l7-7 7 7'} />
											</svg>
										</button>
									</th>
								</tr>
							</thead>
							<tbody>
								{#each documentos as d (d.id)}
									<!-- Toda la fila abre la ficha. Un clic en el enlace lo atiende el enlace (sin stopPropagation: eso le escondía el
									     clic al enrutador de SvelteKit y recargaba la página entera). -->
									<tr class="fila" onclick={(e) => (e.target as HTMLElement).closest('a') || goto(enlace(d.id))} data-testid="fila-documento">
										<td class="col-doc">
											<a class="abrir" href={enlace(d.id)}>{d.archivo}</a>
											<span class="sub">
												{d.paginas ? `${d.paginas} pág.` : ''}
												{#if d.corridas > 1}· {d.corridas} extracciones{/if}
												{#if d.corregidos}· <span class="manual">{d.corregidos} corregido{d.corregidos === 1 ? '' : 's'}</span>{/if}
											</span>
										</td>
										<td>{nombreOrg(d.organizacion)}</td>
										<td>
											{d.tipoDocumental.nombre ?? d.tipoDocumental.id}
											{#if d.tipoDocumental.existe === false}<span class="borrado" title={`El tipo ${d.tipoDocumental.id} se borró después de extraer este documento`}>ya no existe</span>{/if}
										</td>
										<td>{@render barraConfianza(d.confianzaPromedio, d.confianzaMinima)}</td>
										<td>{@render completitud(d)}</td>
										<td><span class="estado {d.estado}" title={d.error ?? ''}>{ETIQUETA_ESTADO[d.estado]}</span></td>
										<td class="col-fecha">
											{#if d.extraidoEn}
												{@const [dia, ...hora] = formatFecha(d.extraidoEn).split(', ')}
												<span>{dia}{hora.length ? ',' : ''}</span>{#if hora.length}{' '}<span>{hora.join(', ')}</span>{/if}
											{:else}—{/if}
										</td>
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
				<p class="vacio">No hay tipos documentales con datos extraídos{filtroOrg || filtroTipo || filtroEstadoTipo ? ' con ese filtro' : ''}.</p>
			{:else}
				<div class="tipos">
					{#each tipos as t (t.organizacion.guid + t.id)}
						<article class="tipo" class:tipo-borrado={t.existe === false} data-testid="tarjeta-tipo">
							<header class="tipo-cabeza">
								<div>
									<h2>
										{t.nombre ?? t.id}
										{#if t.existe === false}<span class="borrado" title={`El tipo ${t.id} se borró; sus documentos extraídos se conservan`}>ya no existe</span>{/if}
									</h2>
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

	/* El selector lista/mosaico: el mismo molde que las pestañas, con íconos. */
	.formato {
		display: inline-flex;
		gap: 0.2rem;
		margin-right: auto;
		margin-left: 0.5rem;
		padding: 0.2rem;
		background: var(--muted);
		border-radius: var(--radius-lg);
	}

	.formato button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 1.85rem;
		padding: 0;
		color: var(--muted-foreground);
		background: none;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
	}

	.formato button.activa {
		color: var(--foreground);
		background: var(--card);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
	}

	/* Mosaico: una tarjeta por documento. */
	.mosaico {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(15.5rem, 1fr));
		gap: 0.85rem;
	}

	.tarjeta-doc {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
		padding: 0.9rem 1rem;
		font: inherit;
		color: var(--foreground);
		text-align: left;
		text-decoration: none;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.tarjeta-doc:hover {
		border-color: var(--primary-line);
		box-shadow: 0 4px 12px -4px rgba(66, 104, 251, 0.25);
	}

	.tarjeta-doc.tipo-borrado {
		background: var(--muted-soft);
		border-style: dashed;
	}

	.tarjeta-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.25rem;
	}

	.icono-doc {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: var(--radius-md);
		color: var(--muted-foreground);
		background: var(--muted);
	}

	.icono-doc.alta {
		color: var(--success);
		background: var(--success-soft);
	}
	.icono-doc.media {
		color: var(--warning);
		background: var(--warning-soft);
	}
	.icono-doc.baja {
		color: var(--destructive);
		background: var(--destructive-soft);
	}

	.tarjeta-tipo {
		font-size: 0.95rem;
		font-weight: 600;
	}

	.tarjeta-archivo {
		font-size: 0.8125rem;
		color: var(--secondary-foreground);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tarjeta-barras {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin-top: 0.4rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--border);
	}

	.tarjeta-fila {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.tarjeta-pie {
		margin-top: 0.3rem;
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

	/* El encabezado «Extraído» es también el botón del orden. */
	.ordenar {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0;
		font: inherit;
		color: var(--foreground);
		font-weight: 500;
		background: none;
		border: none;
		cursor: pointer;
	}

	.ordenar svg {
		color: var(--primary);
	}

	.ordenar:hover {
		color: var(--primary);
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

	.fila:hover {
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
		text-decoration: none;
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

	/* Día y hora no se parten por dentro; si falta ancho, la hora baja al segundo renglón en vez de cortarse. */
	.col-fecha {
		color: var(--muted-foreground);
	}

	.col-fecha span {
		white-space: nowrap;
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

	/* Un tipo documental borrado: sus extracciones son historia y se quedan, pero se avisa. */
	.borrado {
		margin-left: 0.4rem;
		font-size: 0.68rem;
		font-weight: 500;
		color: var(--destructive);
		background: var(--destructive-soft);
		border-radius: var(--radius-sm);
		padding: 0.05rem 0.4rem;
		white-space: nowrap;
		vertical-align: middle;
	}

	.tipo-borrado {
		background: var(--muted-soft);
		border-style: dashed;
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
