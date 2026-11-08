<script lang="ts">
  import { page } from '$app/state';
  import { esAmbiente, AMBIENTE_POR_DEFECTO } from '$lib/ambientes';

  // Barra lateral con las secciones de la app, con el estilo de los ítems de
  // navegación de Biblioratum: azul relleno el activo, gris claro al pasar el
  // cursor. Replegada se queda en una columna de íconos.
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
    },
    {
      // Un candado: quién puede entrar a qué.
      href: '/roles',
      etiqueta: 'Roles',
      icono: ['M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z', 'M8 11V7a4 4 0 0 1 8 0v4']
    }
  ];

  let {
    collapsed = false,
    toggleCollapsed
  }: {
    collapsed?: boolean;
    toggleCollapsed: () => void;
  } = $props();
</script>

<aside class="sidebar" class:colapsada={collapsed}>
  <nav aria-label="Secciones">
    {#each SECCIONES as seccion}
      <a
        href="/{ambiente}{seccion.href}"
        class="nav-item"
        title={collapsed ? seccion.etiqueta : undefined}
        aria-label={collapsed ? seccion.etiqueta : undefined}
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
        {#if !collapsed}<span class="nav-texto">{seccion.etiqueta}</span>{/if}
      </a>
    {/each}
  </nav>

  <div class="sidebar-footer">
    <button
      type="button"
      class="collapse-btn"
      onclick={toggleCollapsed}
      aria-label={collapsed ? 'Mostrar la barra completa' : 'Replegar barra'}
      aria-expanded={!collapsed}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d={collapsed ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'} />
      </svg>
    </button>
  </div>
</aside>

<style>
  /* Pegada bajo la barra superior y de la altura de lo que queda de pantalla, para que no se vaya con el scroll. */
  .sidebar {
    position: sticky;
    top: var(--barra-alto);
    box-sizing: border-box;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    width: 15rem;
    height: calc(100vh - var(--barra-alto));
    padding: 1rem 0.75rem;
    background: var(--card);
    border-right: 1px solid var(--border);
    transition: width 0.2s ease-out;
  }

  .sidebar.colapsada {
    width: 4.25rem;
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
  }

  nav::-webkit-scrollbar {
    display: none;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.65rem 0.75rem;
    color: var(--foreground);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    border-radius: var(--radius-md);
    transition: background 0.15s ease, color 0.15s ease;
  }

  .colapsada .nav-item {
    justify-content: center;
    padding-left: 0;
    padding-right: 0;
  }

  .nav-ico {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--muted-foreground);
  }

  .nav-item:hover {
    background: var(--muted);
  }

  .nav-item[aria-current='page'] {
    color: var(--primary-foreground);
    background: var(--primary);
  }

  .nav-item[aria-current='page'] .nav-ico {
    color: inherit;
  }

  .sidebar-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .collapse-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    color: var(--foreground);
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .collapse-btn:hover {
    background: var(--muted);
  }
</style>
