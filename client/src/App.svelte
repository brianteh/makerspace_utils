<script>
  import Home from './pages/Home.svelte'
  import routes from './routes.js'

  let path = $state(location.hash.slice(1) || '/')

  $effect(() => {
    const onHashChange = () => {
      path = location.hash.slice(1) || '/'
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  })

  const route = $derived(routes.find((r) => r.path === path))
</script>

{#if path === '/'}
  <Home />
{:else if route}
  {@const Page = route.component}
  <Page />
{:else}
  <main class="missing">
    <h1>Page not found</h1>
    <p>“{path}” does not exist.</p>
    <a href="#/">← Back to home</a>
  </main>
{/if}

<style>
  .missing {
    max-width: 1200px;
    margin: 0 auto;
    padding: 64px 24px;
  }

  .missing a {
    color: #2563eb;
  }
</style>
