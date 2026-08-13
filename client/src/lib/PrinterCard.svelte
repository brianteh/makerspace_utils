<script>
  const STATUS_LABELS = {
    idle: 'Idle',
    printing: 'Printing',
    error: 'Error',
    offline: 'Offline',
  }

  let { printer } = $props()
  const imageSrc = printer.imageUrl?.startsWith('/') ? import.meta.env.BASE_URL + printer.imageUrl.slice(1) : printer.imageUrl
  let status = $state(null)
  let loading = $state(true)
  let error = $state(null)

  async function fetchStatus() {
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'status/' + printer.id)
      if (!res.ok) throw new Error(`status ${res.status}`)
      const data = await res.json()
      status = data.status
      loading = false
      error = null
    } catch (err) {
      status = null
      error = err.message
      loading = false
    }
  }

  $effect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 4000)
    return () => clearInterval(interval)
  })
</script>

<article class="card">
  <img src={imageSrc} alt={`${printer.name} photo`} />
  <div class="info">
    <h2>{printer.name}</h2>
    <!-- <p class="id">ID: {printer.id}</p> -->
    {#if loading}
      <span class="badge badge-loading">Loading…</span>
    {:else if error}
      <span class="badge badge-error" title={error}>Unknown</span>
    {:else}
      <span class="badge badge-{status}">
        <span class="dot"></span>
        {STATUS_LABELS[status] ?? status}
      </span>
    {/if}
  </div>
</article>

<style>
  .card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  }

  img {
    display: block;
    width: 100%;
    height: auto;
    object-fit: contain;
    background: #0f172a;
  }

  .info {
    padding: 16px;
    text-align: center;
  }

  h2 {
    margin: 0 0 4px;
    font-size: 18px;
    text-align: center;
  }

  .id {
    margin: 0 0 12px;
    font-size: 13px;
    color: #94a3b8;
    font-family: ui-monospace, monospace;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    text-transform: capitalize;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }

  .badge-loading {
    color: #64748b;
    background: #f1f5f9;
  }

  .badge-idle {
    color: #2563eb;
    background: #eff6ff;
  }

  .badge-printing {
    color: #059669;
    background: #ecfdf5;
  }

  .badge-error {
    color: #dc2626;
    background: #fef2f2;
  }

  .badge-offline {
    color: #475569;
    background: #f1f5f9;
  }
</style>
