<script lang="ts">
	// La ficha de UN documento, como página completa (`/{ambiente}/datos/{documento}`; hasta el 2026-11-12 era un panel lateral):
	// sus campos vigentes acomodados como se leen en papel (generales, grupos y tablas de lo que se repite), cada valor pintado según su
	// confianza, lo que faltó y lo corregido a mano, y abajo la historia de sus extracciones.
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

	/** `volverA`: a dónde lleva «‹ Datos extraídos» (la lista con los filtros que traía). */
	let { ambiente, ficha, volverA }: { ambiente: string; ficha: Ficha; volverA?: string } = $props();

	const secciones = $derived(seccionesDe(ficha.campos));
	const conValor = $derived(ficha.campos.filter((c) => c.valor !== null).length);
	const vigente = $derived(ficha.corridas[0]);
</script>

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

<article class="ficha" data-testid="ficha-documento">
	<header class="cabeza">
		<a class="volver" href={volverA ?? `/${ambiente}/datos`} data-testid="volver-a-datos">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
			Datos extraídos
		</a>
		<h1>{ficha.archivo}</h1>
		<p class="meta">
			{ficha.organizacion.nombre ?? ficha.organizacion.guid}
			· {formatoBytes(ficha.bytes)}
			{#if ficha.extraccion?.paginas}· {ficha.extraccion.paginas} pág.{/if}
			· {ficha.canal === 'API' ? 'por API' : 'subido a mano'}
			{#if ficha.recibidoEn}· recibido el {formatFecha(ficha.recibidoEn)}{/if}
		</p>
	</header>

	{#if ficha.enmascarado}
		<p class="aviso">Producción: los valores van enmascarados. Se ve qué salió, con qué confianza y qué faltó, pero no el dato.</p>
	{/if}

	<div class="resumen">
		<div class="dato-resumen">
			<span class="etq">Tipo documental</span>
			<strong>{vigente?.tipoDocumental.nombre ?? '—'}</strong>
			{#if vigente?.tipoDocumental.existe === false}<span class="sub borrado">ya no existe</span>
			{:else if vigente?.tipoDocumental.revision != null}<span class="sub">revisión {vigente.tipoDocumental.revision}</span>{/if}
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
			{#if ficha.campos.length}<span class="sub">{ficha.campos.length - conValor} sin valor</span>{/if}
		</div>
		<div class="dato-resumen">
			<span class="etq">Estado</span>
			<span class="estado {vigente?.estado}">{ETIQUETA_ESTADO[vigente?.estado ?? 'ok']}</span>
			{#if ficha.clasificacion}
				<span class="sub">
					Clasificado como {ficha.clasificacion.tipoDocumental?.nombre ?? ficha.clasificacion.categoria ?? 'nada'}
					{#if ficha.clasificacion.confianza != null}({Math.round(ficha.clasificacion.confianza)}%){/if}
				</span>
			{/if}
		</div>
	</div>

	{#if ficha.campos.length === 0}
		<p class="vacio">Esta extracción no dejó campos.</p>
	{/if}

	{#each secciones as s (s.titulo)}
		<section class="seccion">
			<h2>{s.titulo}</h2>
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
		<h2>Extracciones <span class="cuenta">{ficha.corridas.length}</span></h2>
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
</article>

<style>
	.ficha {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.volver {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		text-decoration: none;
	}

	.volver:hover {
		color: var(--primary);
	}

	h1 {
		margin: 0.35rem 0 0.25rem;
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 2rem;
		overflow-wrap: anywhere;
	}

	.meta {
		margin: 0;
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	.aviso {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--aviso-atencion-texto);
		background: var(--aviso-atencion-fondo);
		border: 1px solid var(--aviso-atencion-borde);
		border-radius: var(--radius-lg);
		padding: 0.6rem 0.8rem;
	}

	.vacio {
		margin: 0;
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	/* Las cuatro cifras de arriba, con el molde de las de la lista. */
	.resumen {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1rem;
	}

	.dato-resumen {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem 1.25rem;
		background: var(--card);
		border: 2px solid var(--border);
		border-radius: var(--radius-2xl);
	}

	.dato-resumen strong {
		font-size: 1.35rem;
		font-weight: 600;
		line-height: 1.25;
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

	.borrado {
		color: var(--destructive);
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

	/* Cada sección (Generales, un grupo, una tabla de lo que se repite), en la tarjeta de sección de Biblioratum. */
	.seccion {
		background: var(--card);
		border: 2px solid var(--border);
		border-radius: var(--radius-2xl);
		padding: 1.25rem;
	}

	h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 1rem;
		font-size: 0.95rem;
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
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: 0.75rem;
	}

	.campo {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.8rem 0.95rem;
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
		font-size: 1rem;
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

	.corridas li:last-child {
		padding-bottom: 0;
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

	@media (max-width: 900px) {
		.resumen {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
