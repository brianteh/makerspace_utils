<script>
  import '@fullcalendar/web-component/global'
  import dayGridPlugin from '@fullcalendar/daygrid'
  import Tooltip from 'tooltip.js'
  import { onMount } from 'svelte'

  let calendarEl = $state(null)
  let loading = $state(true)
  let error = $state(null)

  function eventDidMount(info) {
    var description = info.event.extendedProps.description || 'No additional details.'
    var title = info.event.title

    var timeString = '📅 All-Day'
    if (!info.event.allDay && info.event.start) {
      var timeOptions = { hour: 'numeric', minute: '2-digit' }
      var startTime = new Intl.DateTimeFormat('en-US', timeOptions).format(info.event.start)
      var endTime = info.event.end ? ' - ' + new Intl.DateTimeFormat('en-US', timeOptions).format(info.event.end) : ''
      timeString = '🕒 ' + startTime + endTime
    }

    var popupContent = `
      <div class="popup-header">${title}</div>
      <div class="popup-time">${timeString}</div>
      <div class="popup-body">${description}</div>
    `

    new Tooltip(info.el, {
      title: popupContent,
      placement: 'top',
      trigger: 'hover',
      container: 'body',
      html: true,
      offset: '0, 10',
    })
  }

  onMount(() => {
    const config = {
      plugins: [dayGridPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next,today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek,dayGridDay',
      },
      eventDidMount,
      events: [],
    }

    calendarEl.options = config

    let cancelled = false
    fetch(import.meta.env.BASE_URL + 'events')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load events: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          calendarEl.getApi()?.addEventSource(data)
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
  {#if error}
    <p class="status-note error">Could not load events: {error}</p>
  {:else if loading}
    <p class="status-note">Loading events…</p>
  {/if}

  <full-calendar bind:this={calendarEl}></full-calendar>
</main>

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }


  .status-note {
    color: #64748b;
    font-style: italic;
  }

  .status-note.error {
    color: #dc2626;
  }

  full-calendar {
    max-width: 900px;
    height: auto;
    margin: 40px auto;
    color: #1c1c1c;

    --fc-button-bg-color: #ef7334;
    --fc-button-border-color: #ef7334;
    --fc-button-hover-bg-color: #ef7334;
    --fc-button-hover-border-color: #ef7334;
    --fc-button-active-bg-color: #fc7303;
    --fc-button-active-border-color: #fc7303;

    --fc-today-bg-color: #cccccc;

    --fc-page-bg-color: #ffffff;
    --fc-neutral-bg-color: #f8f9fa;
    --fc-border-color: #ddd;

    --fc-event-bg-color: #4a154b;
    --fc-event-border-color: #4a154b;
    --fc-event-text-color: #ffffff;
  }

  :global(.tooltip) {
    position: absolute;
    z-index: 10000;
    background: #ffffff;
    color: #1e293b;
    width: 260px;
    padding: 14px;
    border-radius: 10px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
    border: 1px solid #e2e8f0;
    font-size: 13px;
    line-height: 1.5;
    opacity: 0;
    transition: opacity 0.15s ease-in-out;
  }

  :global(.tooltip[aria-hidden='false']) {
    opacity: 1;
  }

  :global(.popup-header) {
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 6px;
    color: #0f172a;
  }

  :global(.popup-time) {
    color: #64748b;
    font-size: 12px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  :global(.popup-body) {
    padding-top: 8px;
    border-top: 1px solid #f1f5f9;
    color: #475569;
  }
</style>
