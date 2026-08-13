<script>
  import routes from '../routes.js'
</script>

<main>
  <h1>Apps</h1>
  <p class="subtitle">Choose a page to open</p>

  <div class="grid">
    {#each routes as route (route.path)}
      <a class="card" href="#{route.path}">
        <h2>{route.name}</h2>
        <p>{route.description}</p>
      </a>
    {/each}
  </div>
</main>

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }

  h1 {
    margin: 0;
    font-size: 32px;
  }

  .subtitle {
    margin: 8px 0 32px;
    color: #64748b;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
  }

  .card {
    display: block;
    padding: 24px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
    color: inherit;
    text-decoration: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .card:hover {
    border-color: #2563eb;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  }

  .card h2 {
    margin: 0 0 8px;
    font-size: 20px;
  }

  .card p {
    margin: 0;
    color: #64748b;
  }
</style>
