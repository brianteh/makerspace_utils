<script>
  import '@fullcalendar/web-component/global'
  import dayGridPlugin from '@fullcalendar/daygrid'
  import tippy from 'tippy.js'
  import 'tippy.js/dist/tippy.css'
  import { onMount } from 'svelte'

  let calendarEl = $state(null)
  let loading = $state(true)
  let error = $state(null)
  let selectedEvent = $state(null)

  function formatTime(event) {
    if (event.allDay || !event.start) return '📅 All-Day'
    var timeOptions = { hour: 'numeric', minute: '2-digit' }
    var startTime = new Intl.DateTimeFormat('en-US', timeOptions).format(event.start)
    var endTime = event.end ? ' - ' + new Intl.DateTimeFormat('en-US', timeOptions).format(event.end) : ''
    return '🕒 ' + startTime + endTime
  }

  function eventDidMount(info) {
    var description = info.event.extendedProps.description || 'No additional details.'
    var title = info.event.title
    var timeString = formatTime(info.event)

    var popupContent = `
      <div class="popup-header">${title}</div>
      <div class="popup-time">${timeString}</div>
      <div class="popup-body">${description}</div>
    `

    tippy(info.el, {
      content: popupContent,
      allowHTML: true,
      trigger: 'mouseenter focus',
      hideOnClick: false,
      placement: 'auto',
      flip: true,
      shift: true,
      preventOverflow: true,
      boundary: 'viewport',
      maxWidth: 260,
      offset: [0, 10],
      theme: 'light',
      interactive: false,
      appendTo: () => document.body,
    })
  }

  function eventClick(info) {
    info.jsEvent.preventDefault()
    selectedEvent = {
      title: info.event.title,
      timeString: formatTime(info.event),
      description: info.event.extendedProps.description || 'No additional details.',
      url: info.event.url || null,
    }
  }

  function closeModal() {
    selectedEvent = null
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
      height: 'auto',
      contentHeight: 'auto',
      expandRows: true,
      handleWindowResize: true,
      stickyHeaderDates: true,
      dayMaxEvents: 2,
      eventDidMount,
      eventClick,
      events: [],
    }

    calendarEl.options = config

    let cancelled = false
    let lastHeight = 0

    function notifyParent() {
      if (cancelled) return
      const h = Math.ceil(
        document.documentElement.scrollHeight || document.body.scrollHeight || calendarEl?.scrollHeight || 0,
      )
      if (Math.abs(h - lastHeight) < 5) return
      lastHeight = h
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'calendar-resize', height: h }, '*')
      }
    }

    function applyStacked() {
      if (!calendarEl || cancelled) return
      const w = calendarEl.clientWidth || window.innerWidth
      const isMobile = w < 640
      if (isMobile) calendarEl.classList.add('is-mobile')
      else calendarEl.classList.remove('is-mobile')
    }

    const fit = () => {
      if (cancelled) return
      requestAnimationFrame(() => {
        if (cancelled) return
        applyStacked()
        calendarEl?.getApi?.()?.updateSize()
        notifyParent()
      })
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') closeModal()
    }

    window.addEventListener('resize', fit)
    window.addEventListener('keydown', onKeyDown)
    const ro = new ResizeObserver(fit)
    ro.observe(document.documentElement)
    if (calendarEl) ro.observe(calendarEl)
    if (calendarEl.parentElement) ro.observe(calendarEl.parentElement)
    fit()

    fetch(import.meta.env.BASE_URL + 'events')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load events: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          calendarEl.getApi()?.addEventSource(data)
          loading = false
          fit()
        }
      })
      .catch((err) => {
        if (!cancelled) {
          error = err.message
          loading = false
          fit()
        }
      })

    return () => {
      cancelled = true
      window.removeEventListener('resize', fit)
      window.removeEventListener('keydown', onKeyDown)
      ro.disconnect()
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

  {#if selectedEvent}
    <div class="modal-backdrop" onclick={closeModal} role="presentation">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onclick={(e) => e.stopPropagation()}>
        <button class="modal-close" onclick={closeModal} aria-label="Close">×</button>
        <div id="modal-title" class="popup-header">{selectedEvent.title}</div>
        <div class="popup-time">{selectedEvent.timeString}</div>
        <div class="popup-body">{selectedEvent.description}</div>
        {#if selectedEvent.url}
          <a class="popup-link" href={selectedEvent.url} target="_blank" rel="noopener">Open link</a>
        {/if}
      </div>
    </div>
  {/if}
</main>

<style>
  main {
    height: auto;
    min-height: 100dvh;
    min-width: 0;
    display: flex;
    flex-direction: column;
    padding: 16px;
    box-sizing: border-box;
    overflow: visible;
    container-type: inline-size;
  }

  .status-note {
    color: #64748b;
    font-style: italic;
  }

  .status-note.error {
    color: #dc2626;
  }

  full-calendar {
    width: 100%;
    max-width: 100%;
    display: block;
    height: auto;
    flex: 0 0 auto;
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

  :global(full-calendar .fc) {
    font-size: clamp(0.75rem, 1.1cqw, 1rem);
  }

  :global(full-calendar .fc-view-harness) {
    height: auto !important;
  }

  :global(full-calendar .fc-scroller) {
    overflow: visible !important;
  }

  :global(.fc-toolbar-title) {
    font-size: 1.75em;
    margin: 0;
  }

  :global(.fc-button) {
    font-size: 1.15em;
  }

  :global(.fc-header-toolbar) {
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
  }

  :global(.fc-toolbar-chunk) {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  :global(.fc-event) {
    cursor: pointer;
  }

  @media (max-width: 640px) {
    main {
      padding: 8px;
    }

    :global(.fc-header-toolbar) {
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    :global(.fc-toolbar-chunk) {
      justify-content: center;
    }

    :global(.fc-toolbar-title) {
      font-size: 1.2em;
      order: -1;
    }

    :global(.fc-button) {
      font-size: 0.85em;
      padding: 4px 8px;
    }

    :global(full-calendar .fc) {
      font-size: clamp(0.7rem, 3.2cqw, 0.9rem);
    }

    :global(.fc-daygrid-day-number) {
      font-size: 0.85em;
    }
  }

  @container (max-width: 480px) {
    :global(.fc-header-toolbar) {
      gap: 4px;
    }

    :global(.fc-button-group) {
      flex-wrap: wrap;
    }
  }

  :global(.tippy-box[data-theme~='light']) {
    background: #ffffff;
    color: #1e293b;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
    font-size: 13px;
    line-height: 1.5;
    max-width: min(260px, 90vw) !important;
  }

  :global(.tippy-box[data-theme~='light'] .tippy-content) {
    padding: 14px;
  }

  :global(.tippy-box[data-theme~='light'] .tippy-arrow) {
    color: #ffffff;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    background: rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(2px);
    z-index: 10001;
  }

  .modal {
    position: relative;
    background: #ffffff;
    color: #1e293b;
    width: min(520px, 90vw);
    max-height: 85vh;
    overflow: auto;
    padding: 20px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    animation: modalIn 0.15s ease-out;
  }

  .modal-close {
    position: absolute;
    top: 8px;
    right: 8px;
    background: transparent;
    border: 0;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    color: #64748b;
  }

  .modal-close:hover {
    color: #0f172a;
  }

  @keyframes modalIn {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (max-width: 640px) {
    .modal {
      width: 95vw;
      padding: 16px;
    }
  }

  :global(.popup-header) {
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 6px;
    color: #0f172a;
    padding-right: 20px;
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

  .popup-link {
    display: inline-block;
    margin-top: 12px;
    color: #2563eb;
    font-size: 13px;
    text-decoration: none;
  }

  .popup-link:hover {
    text-decoration: underline;
  }
</style>
