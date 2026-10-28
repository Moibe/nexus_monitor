<script lang="ts">
  import { page } from '$app/state';
  import { esAmbiente, AMBIENTE_POR_DEFECTO } from '$lib/ambientes';

  // Barra lateral "de vidrio" con el mismo tilt 3D que la superior. Incluye el
  // handle para replegar/mostrar. Publica su ancho real a la variable CSS
  // --sidebar-width para que el panel de contenido se ajuste solo.
  //
  // Las secciones de la app viven aquí. Cuando se agregue una nueva, basta con
  // sumarla a este arreglo: el estado activo sale solo de la ruta.
  //
  // `icono` son los `d` de un SVG de 24x24 trazado con currentColor, para
  // seguir sin depender de ninguna librería de iconos (igual que el resto del
  // chrome). Va por sección y no fijo en el markup, porque si no todas
  // compartirían el mismo dibujo.
  // Las secciones cuelgan del ambiente: su href se arma con el que esté
  // activo, para que navegar por la izquierda NUNCA te cambie de ambiente.
  let ambiente = $derived(esAmbiente(page.params.ambiente) ? page.params.ambiente : AMBIENTE_POR_DEFECTO);

  const SECCIONES = [
    {
      // Un escudo con una palomita: la cuenta con más poder del sistema.
      href: '/superadmins',
      etiqueta: 'Superadmins',
      icono: ['M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z', 'M9 12l2 2 4-4']
    },
    {
      href: '/tablas',
      etiqueta: 'Tablas',
      icono: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M3 9h18', 'M12 9v12']
    },
    {
      href: '/procesadores',
      etiqueta: 'Procesadores',
      icono: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']
    }
  ];

  let {
    collapsed = false,
    toggleCollapsed
  }: {
    collapsed?: boolean;
    toggleCollapsed: () => void;
  } = $props();

  let tiltX = $state(0);
  let tiltY = $state(0);
  let sidebarWidth = $state(240);

  $effect(() => {
    if (typeof document !== 'undefined' && !collapsed) {
      document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    }
  });

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

  function handleCollapseClick(e: MouseEvent) {
    e.stopPropagation();
    tiltX = 0;
    tiltY = 0;
    toggleCollapsed();
  }
</script>

{#if !collapsed}
  <aside
    class="sidebar"
    style="transform: perspective(900px) rotateX({tiltX}deg) rotateY({tiltY}deg);"
    bind:clientWidth={sidebarWidth}
    onmousemove={handleMove}
    onmouseleave={handleLeave}
  >
    <nav>
      {#each SECCIONES as seccion}
        <a
          href="/{ambiente}{seccion.href}"
          class="nav-item"
          aria-current={page.url.pathname.startsWith(`/${ambiente}${seccion.href}`) ? 'page' : undefined}
        >
          <span class="nav-ico" aria-hidden="true">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              {#each seccion.icono as d}
                <path {d} />
              {/each}
            </svg>
          </span>
          <span>{seccion.etiqueta}</span>
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <button
        type="button"
        class="collapse-btn"
        onclick={handleCollapseClick}
        aria-label="Replegar barra"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
    </div>
  </aside>
{:else}
  <button
    type="button"
    class="reveal-handle"
    onclick={toggleCollapsed}
    aria-label="Mostrar barra"
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  </button>
{/if}

<style>
  .sidebar {
    position: fixed;
    top: calc(2rem + var(--topnav-height, 64px));
    left: 1rem;
    bottom: 1rem;
    box-sizing: border-box;
    width: max-content;
    min-width: 240px;
    max-width: 380px;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
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
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  nav::-webkit-scrollbar {
    display: none;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 0.95rem;
    color: #374151;
    text-decoration: none;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    border-radius: 8px;
    border: 1px solid transparent;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  }

  .nav-ico {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #9ca3af;
  }

  .nav-item:hover {
    background: rgba(37, 99, 235, 0.07);
    border-color: rgba(37, 99, 235, 0.16);
    color: #1f2937;
  }

  .nav-item[aria-current='page'] {
    color: #1d4ed8;
    background: rgba(37, 99, 235, 0.1);
    border-color: rgba(37, 99, 235, 0.3);
    font-weight: 600;
  }

  .nav-item[aria-current='page'] .nav-ico {
    color: #2563eb;
  }

  .sidebar-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid rgba(17, 24, 39, 0.1);
  }

  .collapse-btn,
  .reveal-handle {
    background: rgba(37, 99, 235, 0.05);
    border: 1px solid rgba(37, 99, 235, 0.18);
    border-radius: 8px;
    padding: 0.4rem 0.5rem;
    color: #374151;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: inherit;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  }

  .collapse-btn:hover,
  .reveal-handle:hover {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.35);
    color: #1d4ed8;
  }

  /* Cuando la barra está replegada, queda solo este handle flotante de vidrio. */
  .reveal-handle {
    position: fixed;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    padding: 0.55rem 0.45rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.9);
    background: #ffffff;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      0 8px 24px rgba(0, 0, 0, 0.18);
    z-index: 10;
  }
</style>
