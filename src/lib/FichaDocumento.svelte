<script lang="ts">
	// La ficha de UN documento: sus campos vigentes acomodados como se leen en papel (generales, grupos y tablas de lo que se repite),
	// cada valor pintado según su confianza, lo que faltó y lo corregido a mano, y abajo la historia de sus extracciones.
	// Es un panel que entra por la derecha, como el `Sheet` de Biblioratum.
	import { formatFecha } from '$lib/procesadores';
	import {
		ETIQUETA_ESTADO,
		MOTIVO_SIN_VALOR,
		formatoBytes,
		nivelDe,
		seccionesDe,
		type CampoFicha,
		type Ficha
	} from '$lib/datos';

	let { ambiente, id, onCerrar }: { ambiente: string; id: string | null; onCerrar: () => void } = $props();

	let ficha = $state<Ficha | null>(null);
	let cargando = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		const actual = id;
		ficha = null;
		error = null;
		if (!actual) return;
		cargando = true;
		let vigente = true;
		fetch(`/api/${ambiente}/datos/${actual}`)
			.then(async (r) => {
				const cuerpo = await r.json().catch(() => null);
				if (!vigente) return;
				if (!r.ok) error = cuerpo?.message ?? `Error ${r.status} al abrir el documento.`;
				else ficha = cuerpo as Ficha;
			})
			.catch(() => vigente && (error = 'No se pudo contactar a Monitor.'))
			.finally(() => vigente && (cargando = false));
		return () => {
			vigente = false;
		};
	});

	const secciones = $derived(ficha ? seccionesDe(ficha.campos) : []);
	const conValor = $derived(ficha?.campos.filter((c) => c.valor !== null).length ?? 0);

	function teclado(e: KeyboardEvent) {
		if (e.key === 'Escape') onCerrar();
	}
</script>

<svelte:window onkeydown={id ? teclado : undefined} />

{#snippet valor(c: CampoFicha, grande: boolean)}
	{#if c.valor === null}
		<span class="sin-valor">{MOTIVO_SIN_VALOR[c.motivoSinValor ?? ''] ?? 'Sin valor'}</span>
	{:else}
		<span class="valor" class:grande>{c.valor}</span>
		{#if c.corregido}
			<span class="corregido" title={`Corregido${c.corregidoPor ? ` por ${c.corregidoPor}` : ''}${c.corregidoEn ? ` el ${formatFecha(c.corregidoEn)}` : ''}`}>
				Corregido · extraído: <s>{c.valorExtraido ?? '—'}</s>
			</span>
		{/if}
	{/if}
{/snippet}

{#snippet confianza(c: CampoFicha)}
	{#if c.valor === null}
		<span class="conf nula">—</span>
	{:else if c.corregido}
		<span class="conf manual" title="Lo puso una persona">a mano</span>
	{:else if c.confianza !== null}
		<span class="conf {nivelDe(c.confianza)}" title="Confianza de Document AI">{Math.round(c.confianza)}%</span>
	{/if}
{/snippet}

{#if id}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="overlay" onclick={onCerrar}></div>
	<div class="panel" role="dialog" aria-modal="true" aria-labelledby="ficha-titulo" data-testid="ficha-documento">
		<header class="cabeza">
			<div class="cabeza-texto">
				<p class="miga">Documento</p>
				<h2 id="ficha-titulo">{ficha?.archivo ?? (cargando ? 'Cargando…' : '—')}</h2>
				{#if ficha}
					<p class="meta">
						{ficha.organizacion.nombre ?? ficha.organizacion.guid}
						· {formatoBytes(ficha.bytes)}
						{#if ficha.extraccion?.paginas}· {ficha.extraccion.paginas} pág.{/if}
						· {ficha.canal === 'API' ? 'por API' : 'subido a mano'}
						{#if ficha.recibidoEn}· {formatFecha(ficha.recibidoEn)}{/if}
					</p>
				{/if}
			</div>
			<button type="button" class="cerrar" aria-label="Cerrar" onclick={onCerrar}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
			</button>
		</header>

		<div class="cuerpo">
			{#if error}
				<p class="error">{error}</p>
			{:else if cargando && !ficha}
				<p class="vacio">Cargando la ficha…</p>
			{:else if ficha}
				{#if ficha.enmascarado}
					<p class="aviso">Producción: los valores van enmascarados. Se ve qué salió, con qué confianza y qué faltó, pero no el dato.</p>
				{/if}

				<div class="resumen">
					<div class="dato-resumen">
						<span class="etq">Tipo documental</span>
						<strong>{ficha.corridas[0]?.tipoDocumental.nombre ?? '—'}</strong>
					</div>
					<div class="dato-resumen">
						<span class="etq">Confianza</span>
						<strong class="conf-txt {nivelDe(ficha.extraccion?.confianzaPromedio)}">
							{ficha.extraccion?.confianzaPromedio != null ? `${Math.round(ficha.extraccion.confianzaPromedio)}%` : '—'}
						</strong>
						{#if ficha.extraccion?.confianzaMinima != null}<span class="sub">mín. {Math.round(ficha.extraccion.confianzaMinima)}%</span>{/if}
					</div>
					<div class="dato-resumen">
						<span class="etq">Campos con valor</span>
						<strong>{conValor} de {ficha.campos.length}</strong>
					</div>
					<div class="dato-resumen">
						<span class="etq">Estado</span>
						<span class="estado {ficha.corridas[0]?.estado}">{ETIQUETA_ESTADO[ficha.corridas[0]?.estado ?? 'ok']}</span>
					</div>
				</div>

				{#if ficha.clasificacion}
					<p class="clasif">
						El clasificador dijo
						<strong>{ficha.clasificacion.tipoDocumental?.nombre ?? ficha.clasificacion.categoria ?? 'nada'}</strong>
						{#if ficha.clasificacion.confianza != null}con {Math.round(ficha.clasificacion.confianza)}% de confianza{/if}.
					</p>
				{/if}

				{#if ficha.campos.length === 0}
					<p class="vacio">Esta extracción no dejó campos.</p>
				{/if}

				{#each secciones as s (s.titulo)}
					<section class="seccion">
						<h3>{s.titulo}</h3>
						{#if s.tipo === 'simple'}
							<div class="rejilla">
								{#each s.campos as c (c.ruta)}
									<div class="campo" class:falta={c.valor === null} data-testid="campo-ficha">
										<div class="campo-top">
											<span class="campo-etq" title={c.ruta}>{c.etiqueta}</span>
											{@render confianza(c)}
										</div>
										{@render valor(c, true)}
										{#if c.pagina}<span class="pagina">pág. {c.pagina}</span>{/if}
									</div>
								{/each}
							</div>
						{:else}
							<div class="tabla-wrap">
								<table class="tabla-campos">
									<thead>
										<tr>
											<th class="col-n">#</th>
											{#each s.columnas as col (col)}<th>{col}</th>{/each}
										</tr>
									</thead>
									<tbody>
										{#each s.filas as f (f.indice)}
											<tr>
												<td class="col-n">{f.indice}</td>
												{#each s.columnas as col (col)}
													{@const c = f.celdas[col]}
													<td>
														{#if c}
															<div class="celda">
																{@render valor(c, false)}
																{@render confianza(c)}
															</div>
														{:else}
															<span class="sin-valor">—</span>
														{/if}
													</td>
												{/each}
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</section>
				{/each}

				<section class="seccion">
					<h3>Extracciones <span class="cuenta">{ficha.corridas.length}</span></h3>
					<ol class="corridas">
						{#each ficha.corridas as r, i (r.id)}
							<li class:vigente={i === 0}>
								<span class="punto {r.estado}"></span>
								<div>
									<p class="corrida-linea">
										<span class="estado {r.estado}">{ETIQUETA_ESTADO[r.estado]}</span>
										<strong>{r.tipoDocumental.nombre ?? r.tipoDocumental.id}</strong>
										{#if r.tipoDocumental.revision != null}<span class="sub">rev. {r.tipoDocumental.revision}</span>{/if}
										{#if r.confianzaPromedio != null}<span class="conf {nivelDe(r.confianzaPromedio)}">{Math.round(r.confianzaPromedio)}%</span>{/if}
									</p>
									<p class="sub">
										{r.terminadaEn ? formatFecha(r.terminadaEn) : '—'} · {r.campos} campos · procesador <code>{r.procesador.id}</code>
										· {r.extraidoPor}
									</p>
									{#if r.error}<p class="corrida-error">{r.error}</p>{/if}
								</div>
							</li>
						{/each}
					</ol>
				</section>
			{/if}
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: rgba(0, 0, 0, 0.1);
		backdrop-filter: blur(2px);
	}

	.panel {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 61;
		display: flex;
		flex-direction: column;
		width: min(46rem, 96vw);
		background: var(--card);
		border-left: 1px solid var(--border);
		box-shadow: -10px 0 25px -5px rgba(0, 0, 0, 0.08);
		animation: entra 0.18s ease-out;
	}

	@keyframes entra {
		from {
			transform: translateX(2rem);
			opacity: 0;
		}
	}

	.cabeza {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1.25rem 1.5rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	.cabeza-texto {
		flex: 1;
		min-width: 0;
	}

	.miga {
		margin: 0;
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	h2 {
		margin: 0.15rem 0 0.25rem;
		font-size: 1.15rem;
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.meta {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.cerrar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		color: var(--muted-foreground);
		background: none;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
	}

	.cerrar:hover {
		background: var(--muted);
		color: var(--foreground);
	}

	.cuerpo {
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem 1.5rem 2rem;
	}

	.error,
	.aviso {
		margin: 0 0 1rem;
		font-size: 0.8125rem;
		border-radius: var(--radius-lg);
		padding: 0.6rem 0.8rem;
	}

	.error {
		color: var(--aviso-error-texto);
		background: var(--aviso-error-fondo);
		border: 1px solid var(--aviso-error-borde);
	}

	.aviso {
		color: var(--aviso-atencion-texto);
		background: var(--aviso-atencion-fondo);
		border: 1px solid var(--aviso-atencion-borde);
	}

	.vacio {
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	.resumen {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.dato-resumen {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.75rem 0.85rem;
		background: var(--muted-soft);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
	}

	.dato-resumen strong {
		font-size: 1rem;
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.etq {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.sub {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.conf-txt.alta {
		color: var(--success);
	}
	.conf-txt.media {
		color: var(--warning);
	}
	.conf-txt.baja {
		color: var(--destructive);
	}

	.clasif {
		margin: 0 0 1.25rem;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.seccion {
		margin-top: 1.5rem;
	}

	h3 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.75rem;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.cuenta {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--muted-foreground);
		background: var(--muted);
		border-radius: var(--radius-sm);
		padding: 0 0.4rem;
	}

	/* Cada campo, una tarjetita: la etiqueta chica arriba con su confianza, el valor grande. */
	.rejilla {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.6rem;
	}

	.campo {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.7rem 0.85rem;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
	}

	.campo.falta {
		background: var(--aviso-atencion-fondo);
		border-color: rgba(251, 191, 36, 0.55);
	}

	.campo-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.campo-etq {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.valor {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--foreground);
		overflow-wrap: anywhere;
	}

	.valor.grande {
		font-size: 0.95rem;
	}

	.sin-valor {
		font-size: 0.8125rem;
		font-style: italic;
		color: var(--aviso-atencion-texto);
	}

	.corregido {
		font-size: 0.72rem;
		color: var(--primary-strong);
	}

	.corregido s {
		color: var(--muted-foreground);
	}

	.pagina {
		font-size: 0.7rem;
		color: var(--muted-foreground);
	}

	.conf {
		flex-shrink: 0;
		font-size: 0.7rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		padding: 0.05rem 0.4rem;
		white-space: nowrap;
	}

	.conf.alta {
		color: var(--success);
		background: var(--success-soft);
	}
	.conf.media {
		color: var(--warning);
		background: var(--warning-soft);
	}
	.conf.baja {
		color: var(--destructive);
		background: var(--destructive-soft);
	}
	.conf.nula {
		color: var(--muted-foreground);
	}
	.conf.manual {
		color: var(--primary-strong);
		background: var(--primary-soft);
	}

	.tabla-wrap {
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
	}

	.tabla-campos {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}

	.tabla-campos th {
		text-align: left;
		font-size: 0.72rem;
		font-weight: 400;
		color: var(--muted-foreground);
		background: var(--muted-soft);
		padding: 0.5rem 0.65rem;
		border-bottom: 1px solid var(--border);
		white-space: nowrap;
	}

	.tabla-campos td {
		padding: 0.5rem 0.65rem;
		border-bottom: 1px solid var(--border);
		vertical-align: top;
	}

	.tabla-campos tbody tr:last-child td {
		border-bottom: none;
	}

	.col-n {
		width: 2rem;
		color: var(--muted-foreground);
	}

	.celda {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
	}

	.estado {
		display: inline-block;
		width: fit-content;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: var(--radius-sm);
		padding: 0.125rem 0.5rem;
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

	.corridas {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.corridas li {
		position: relative;
		display: flex;
		gap: 0.75rem;
		padding: 0 0 1rem;
	}

	/* La línea de tiempo: un punto por corrida, unidos por una línea. */
	.corridas li:not(:last-child)::before {
		content: '';
		position: absolute;
		left: 0.31rem;
		top: 1rem;
		bottom: 0;
		width: 1px;
		background: var(--border);
	}

	.punto {
		flex-shrink: 0;
		width: 0.65rem;
		height: 0.65rem;
		margin-top: 0.3rem;
		border-radius: 999px;
		background: var(--muted-foreground);
	}

	.punto.ok {
		background: var(--success);
	}
	.punto.no_reconocido {
		background: var(--warning);
	}
	.punto.error {
		background: var(--destructive);
	}

	.corridas li:not(.vigente) {
		opacity: 0.7;
	}

	.corrida-linea {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.45rem;
		margin: 0 0 0.2rem;
		font-size: 0.8125rem;
	}

	.corridas .sub {
		margin: 0;
	}

	.corridas code {
		font-family: var(--font-mono);
		font-size: 0.72rem;
	}

	.corrida-error {
		margin: 0.3rem 0 0;
		font-size: 0.75rem;
		color: var(--aviso-error-texto);
	}

	@media (max-width: 640px) {
		.resumen {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.rejilla {
			grid-template-columns: 1fr;
		}
	}
</style>
