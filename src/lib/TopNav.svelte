<script lang="ts">
  import { page } from '$app/state';
  import { AMBIENTES, esAmbiente, AMBIENTE_POR_DEFECTO } from '$lib/ambientes';

  // El ambiente en el que estamos, y la sección que se está viendo. Cambiar de
  // ambiente CONSERVA la sección: si estás en Tablas de dev y te pasas a prod,
  // llegas a Tablas de prod, no a la pantalla de inicio. Es lo que uno espera
  // al comparar dos ambientes, que es justo para lo que sirve esta barra.
  let ambiente = $derived(esAmbiente(page.params.ambiente) ? page.params.ambiente : AMBIENTE_POR_DEFECTO);
  let seccionActual = $derived(page.url.pathname.split('/')[2] || 'procesadores');

  // Barra superior "de vidrio" con tilt 3D al pasar el mouse (parallax).
  // Se calcula la posición relativa del cursor (-1..1 en cada eje) y la barra
  // se inclina suavemente hacia él; vuelve a plano al salir (transition).
  let tiltX = $state(0);
  let tiltY = $state(0);

  function handleMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    const MAX = 1.2;
    tiltX = -ny * MAX;
    tiltY = nx * MAX;
  }

  function handleLeave() {
    tiltX = 0;
    tiltY = 0;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<header
  class="topnav"
  style="transform: perspective(900px) rotateX({tiltX}deg) rotateY({tiltY}deg);"
  onmousemove={handleMove}
  onmouseleave={handleLeave}
>
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

  <div class="spacer"></div>
</header>

<style>
  .topnav {
    position: fixed;
    top: 1rem;
    left: 1rem;
    right: 1rem;
    height: var(--topnav-height, 64px);
    padding: 0 1.25rem;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    background: #ffffff;
    color: #1f2937;
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 16px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      0 8px 24px rgba(0, 0, 0, 0.18);
    transition: transform 0.18s ease-out;
    will-change: transform;
    user-select: none;
    z-index: 9;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    color: #111827;
    text-decoration: none;
    border-radius: 8px;
    padding: 0.25rem 0.4rem;
    transition: background 0.18s ease;
  }

  .brand:hover {
    background: rgba(37, 99, 235, 0.06);
  }

  .brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    /* Sin fondo ni color propio: hereda el gris del texto de la marca, para
       que el ojo se lea como parte del nombre y no como un badge aparte. */
    color: #6b7280;
  }

  .brand-title {
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: 0.005em;
  }

  .ambientes {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-left: 1.5rem;
    padding-left: 1.5rem;
    border-left: 1px solid rgba(17, 24, 39, 0.1);
  }

  .ambiente {
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    border-radius: 999px;
    padding: 0.3rem 0.85rem;
    border: 1px solid transparent;
    color: #6b7280;
    transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
  }

  .ambiente:hover {
    background: rgba(17, 24, 39, 0.05);
    color: #374151;
  }

  /* Cada ambiente con su color, y SOLO cuando está seleccionado: si los tres
     fueran de color siempre, la barra sería un semáforo y el que importa —en
     cuál estoy parado— dejaría de saltar a la vista. Producción va en rojo
     porque es donde un clic de más duele. */
  .ambiente.dev[aria-current='page'] {
    color: #1d4ed8;
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.35);
  }

  .ambiente.staging[aria-current='page'] {
    color: #b45309;
    background: rgba(180, 83, 9, 0.12);
    border-color: rgba(180, 83, 9, 0.35);
  }

  .ambiente.prod[aria-current='page'] {
    color: #ffffff;
    background: #b91c1c;
    border-color: #b91c1c;
  }

  .spacer {
    flex: 1;
  }
</style>
