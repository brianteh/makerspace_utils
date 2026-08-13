<script>
  import PrinterCard from '../lib/PrinterCard.svelte'

  let printers = $state([])
  let loading = $state(true)
  let error = $state(null)
  
  $effect(() => {

    let cancelled = false
    fetch(import.meta.env.BASE_URL + 'printers')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load printers: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          printers = data
          loading = false
        }
      })
      .catch((err) => {
        if (!cancelled) {
          error = err.message
          loading = false
        }
      })
    return () => {
      cancelled = true
    }
  })
</script>

<main>
  
  {#if loading}
    <p class="status-note">Loading printers…</p>
  {:else if error}
    <p class="status-note error">Could not load printers: {error}</p>
  {:else}
    <div class="grid">
      {#each printers as printer (printer.id)}
        <PrinterCard printer={printer} />
      {/each}
    </div>
  {/if}
</main>

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
  }

  .status-note {
    color: #64748b;
    font-style: italic;
  }

  .status-note.error {
    color: #dc2626;
  }
</style>
