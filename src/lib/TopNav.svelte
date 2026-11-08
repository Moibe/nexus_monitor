<script lang="ts">
  import { page } from '$app/state';
  import { AMBIENTES, esAmbiente, AMBIENTE_POR_DEFECTO } from '$lib/ambientes';

  // El ambiente en el que estamos, y la sección que se está viendo. Cambiar de
  // ambiente CONSERVA la sección: si estás en Tablas de dev y te pasas a prod,
  // llegas a Tablas de prod, no a la pantalla de inicio. Es lo que uno espera
  // al comparar dos ambientes, que es justo para lo que sirve esta barra.
  let ambiente = $derived(esAmbiente(page.params.ambiente) ? page.params.ambiente : AMBIENTE_POR_DEFECTO);
  let seccionActual = $derived(page.url.pathname.split('/')[2] || 'procesadores');
</script>

<!-- La barra de Biblioratum (`TopBar.svelte`): blanca, pegada arriba, con una línea abajo, 64 px de alto y la marca a la
     izquierda. Los «ítems» de su navegación son aquí los tres ambientes. -->
<header class="topnav">
  <a href="/" class="brand" aria-label="Inicio">
    <span class="brand-mark" aria-hidden="true">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </span>
    <span class="brand-title">Nexus Monitor</span>
  </a>

  <nav class="ambientes" aria-label="Ambiente">
    {#each AMBIENTES as amb}
      <a
        href="/{amb.id}/{seccionActual}"
        class="ambiente {amb.id}"
        aria-current={amb.id === ambiente ? 'page' : undefined}
      >
        {amb.etiqueta}
      </a>
    {/each}
  </nav>
</header>

<style>
  .topnav {
    position: sticky;
    top: 0;
    z-index: 40;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    height: var(--barra-alto);
    padding: 0 1.5rem;
    background: var(--card);
    border-bottom: 1px solid var(--border);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--foreground);
    text-decoration: none;
  }

  /* El cuadro azul con la figura en blanco hace de logo, como la «B» de Biblioratum en sus correos. */
  .brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    color: var(--primary-foreground);
    background: var(--primary);
    border-radius: var(--radius-md);
  }

  .brand-title {
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: -0.005em;
  }

  .ambientes {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-left: 1.5rem;
    border-left: 1px solid var(--border);
  }

  /* Mismo molde que los ítems de la barra de Biblioratum: rectángulo redondeado de 8 px, texto de 12 px, medium. */
  .ambiente {
    padding: 0.55rem 0.8rem;
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1;
    color: var(--foreground);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: background 0.15s ease, color 0.15s ease;
  }

  .ambiente:hover {
    background: var(--muted);
  }

  /* El seleccionado va relleno, como el ítem activo de Biblioratum. Cada ambiente con su color, y SOLO cuando está
     seleccionado: si los tres fueran de color siempre, la barra sería un semáforo y el que importa —en cuál estoy
     parado— dejaría de saltar a la vista. Producción va en rojo porque es donde un clic de más duele. */
  .ambiente[aria-current='page'] {
    color: var(--primary-foreground);
  }

  .ambiente.dev[aria-current='page'] {
    background: var(--primary);
  }

  .ambiente.staging[aria-current='page'] {
    background: var(--warning);
  }

  .ambiente.prod[aria-current='page'] {
    background: var(--destructive);
  }
</style>
