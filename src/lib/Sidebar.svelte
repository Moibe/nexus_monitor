<script lang="ts">
  // Barra lateral "de vidrio" con el mismo tilt 3D que la superior. Incluye el
  // handle para replegar/mostrar. Publica su ancho real a la variable CSS
  // --sidebar-width para que el panel de contenido se ajuste solo.
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
      <a href="/" class="nav-item" aria-current="page">
        <span class="nav-ico" aria-hidden="true"></span>
        <span>Sección uno</span>
      </a>
      <a href="/" class="nav-item">
        <span class="nav-ico" aria-hidden="true"></span>
        <span>Sección dos</span>
      </a>
      <a href="/" class="nav-item">
        <span class="nav-ico" aria-hidden="true"></span>
        <span>Sección tres</span>
      </a>
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
    width: 16px;
    height: 16px;
    border-radius: 5px;
    flex-shrink: 0;
    background: rgba(37, 99, 235, 0.25);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
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
    background: #2563eb;
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
