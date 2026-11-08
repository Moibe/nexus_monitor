<script lang="ts">
  import '@fontsource/plus-jakarta-sans/400.css';
  import '@fontsource/plus-jakarta-sans/500.css';
  import '@fontsource/plus-jakarta-sans/600.css';
  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';
  import Sidebar from '$lib/Sidebar.svelte';
  import TopNav from '$lib/TopNav.svelte';

  let { children } = $props();
  // Arranca desplegada: ya hay secciones reales que mostrar. Replegada queda
  // una columna angosta con solo los íconos (no desaparece, como hacía el
  // «handle» flotante de la versión de vidrio).
  let collapsed = $state(false);

  function toggleCollapsed() {
    collapsed = !collapsed;
  }
</script>

<svelte:head>
  <title>Nexus Monitor</title>
  <link rel="icon" href={favicon} />
</svelte:head>

<!-- La cáscara es la de Biblioratum: barra superior blanca con borde abajo, fondo gris claro, contenido con tope de ancho y
     el pie de «© Grupo CSI». Lo único que Biblioratum no tiene y Monitor sí es la barra lateral con las secciones. -->
<div class="app">
  <TopNav />

  <div class="cuerpo">
    <Sidebar {collapsed} {toggleCollapsed} />

    <div class="columna">
      <main>
        {@render children()}
      </main>

      <footer>
        <p>© 2026 Grupo CSI. Todos los derechos reservados.</p>
      </footer>
    </div>
  </div>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .cuerpo {
    display: flex;
    flex: 1;
    align-items: flex-start;
  }

  .columna {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    min-height: calc(100vh - var(--barra-alto));
  }

  main {
    flex: 1;
    box-sizing: border-box;
    width: 100%;
    max-width: var(--contenido-ancho);
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  footer {
    border-top: 1px solid var(--border);
    padding: 1.5rem 0;
  }

  footer p {
    margin: 0;
    text-align: center;
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }
</style>
