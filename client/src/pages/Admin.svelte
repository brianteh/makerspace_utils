<script>
  let authLoading = $state(true)
  let user = $state(null)
  let loginUsername = $state('')
  let loginPassword = $state('')
  let loginError = $state(null)

  let events = $state([])
  let printers = $state([])
  let loading = $state(false)
  let error = $state(null)
  let tab = $state('events')

  let eventForm = $state({ id: null, title: '', start: '', end: '', allDay: false, groupId: '', url: '', description: '' })
  let printerForm = $state({ id: '', name: '', imageUrl: '', ip: '', serial: '', accessCode: '' })

  async function checkAuth() {
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/me')
      if (res.ok) {
        user = await res.json()
      } else {
        user = null
      }
    } catch {
      user = null
    } finally {
      authLoading = false
    }
  }

  async function tryLogin() {
    loginError = null
    const res = await fetch(import.meta.env.BASE_URL + 'api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginUsername, password: loginPassword }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      loginError = body.error || 'login failed'
      return
    }
    loginPassword = ''
    user = await res.json()
  }

  async function logout() {
    await fetch(import.meta.env.BASE_URL + 'api/logout', { method: 'POST' })
    user = null
  }

  async function refresh() {
    if (!user) return
    try {
      const [evRes, prRes] = await Promise.all([
        fetch(import.meta.env.BASE_URL + 'events'),
        fetch(import.meta.env.BASE_URL + 'printers'),
      ])
      if (!evRes.ok) throw new Error(`events ${evRes.status}`)
      if (!prRes.ok) throw new Error(`printers ${prRes.status}`)
      events = await evRes.json()
      printers = await prRes.json()
      error = null
    } catch (err) {
      error = err.message
    } finally {
      loading = false
    }
  }

  async function request(url, options = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `request failed: ${res.status}`)
    }
    return res
  }

  async function createEvent() {
    if (!eventForm.title || !eventForm.start) return alert('Title and start are required')
    try {
      await request(import.meta.env.BASE_URL + 'api/events', {
        method: 'POST',
        body: JSON.stringify({
          title: eventForm.title,
          start: eventForm.start,
          end: eventForm.end || null,
          allDay: eventForm.allDay,
          groupId: eventForm.groupId || null,
          url: eventForm.url || null,
          description: eventForm.description,
        }),
      })
      resetEvent()
      await refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  async function updateEvent() {
    try {
      await request(import.meta.env.BASE_URL + 'api/events/' + eventForm.id, {
        method: 'PUT',
        body: JSON.stringify({
          title: eventForm.title,
          start: eventForm.start,
          end: eventForm.end || null,
          allDay: eventForm.allDay,
          groupId: eventForm.groupId || null,
          url: eventForm.url || null,
          description: eventForm.description,
        }),
      })
      resetEvent()
      await refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  async function deleteEvent(event) {
    if (!confirm(`Delete event "${event.title}"?`)) return
    try {
      await request(import.meta.env.BASE_URL + 'api/events/' + event.id, { method: 'DELETE' })
      await refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  function editEvent(event) {
    eventForm = {
      id: String(event.id),
      title: event.title,
      start: event.start || '',
      end: event.end || '',
      allDay: !!event.allDay,
      groupId: event.groupId || '',
      url: event.url || '',
      description: event.extendedProps?.description || '',
    }
  }

  function resetEvent() {
    eventForm = { id: null, title: '', start: '', end: '', allDay: false, groupId: '', url: '', description: '' }
  }

  async function createPrinter() {
    if (!printerForm.id || !printerForm.name) return alert('ID and name are required')
    try {
      await request(import.meta.env.BASE_URL + 'api/printers', {
        method: 'POST',
        body: JSON.stringify({
          id: printerForm.id,
          name: printerForm.name,
          imageUrl: printerForm.imageUrl || null,
          ip: printerForm.ip || null,
          serial: printerForm.serial || null,
          accessCode: printerForm.accessCode || null,
        }),
      })
      resetPrinter()
      await refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  async function updatePrinter() {
    try {
      await request(import.meta.env.BASE_URL + 'api/printers/' + printerForm.originalId, {
        method: 'PUT',
        body: JSON.stringify({
          name: printerForm.name,
          imageUrl: printerForm.imageUrl || null,
          ip: printerForm.ip || null,
          serial: printerForm.serial || null,
          accessCode: printerForm.accessCode || null,
        }),
      })
      resetPrinter()
      await refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  async function deletePrinter(printer) {
    if (!confirm(`Delete printer "${printer.name}"?`)) return
    try {
      await request(import.meta.env.BASE_URL + 'api/printers/' + printer.id, { method: 'DELETE' })
      await refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  function editPrinter(printer) {
    printerForm = {
      originalId: printer.id,
      id: printer.id,
      name: printer.name,
      imageUrl: printer.imageUrl || '',
      ip: printer.ip || '',
      serial: printer.serial || '',
      accessCode: printer.accessCode || '',
    }
  }

  function resetPrinter() {
    printerForm = { originalId: null, id: '', name: '', imageUrl: '', ip: '', serial: '', accessCode: '' }
  }

  $effect(() => {
    checkAuth()
  })

  $effect(() => {
    if (user) refresh()
    else {
      events = []
      printers = []
    }
  })
</script>

<main>
  <h1>Admin</h1>
  <p class="subtitle">Manage calendar events and printers (SQLite)</p>

  {#if authLoading}
    <p class="status-note">Checking session…</p>
  {:else if !user}
    <section class="login-card">
      <h2>Sign in</h2>
      {#if loginError}
        <p class="status-note error">{loginError}</p>
      {/if}
      <form onsubmit={(e) => { e.preventDefault(); tryLogin() }}>
        <label>Username <input autocomplete="username" bind:value={loginUsername} /></label>
        <label>Password <input type="password" autocomplete="current-password" bind:value={loginPassword} /></label>
        <button type="submit">Sign in</button>
      </form>
    </section>
  {:else}
    <div class="toolbar">
      <span class="signed-in">Signed in as {user.username}</span>
      <button class="ghost" onclick={logout}>Sign out</button>
    </div>

    {#if loading}
      <p class="status-note">Loading…</p>
    {:else if error}
      <p class="status-note error">Could not load: {error}</p>
    {/if}

    <nav class="tabs">
    <button class:active={tab === 'events'} onclick={() => (tab = 'events')}>Events</button>
    <button class:active={tab === 'printers'} onclick={() => (tab = 'printers')}>Printers</button>
  </nav>

  {#if tab === 'events'}
    <section>
      <h2>{eventForm.id ? 'Edit Event' : 'New Event'}</h2>
      <form onsubmit={(e) => { e.preventDefault(); eventForm.id ? updateEvent() : createEvent() }}>
        <label>Title <input bind:value={eventForm.title} /></label>
        <label>Start <input type="datetime-local" bind:value={eventForm.start} /></label>
        <label>End <input type="datetime-local" bind:value={eventForm.end} /></label>
        <label class="checkbox">All-day <input type="checkbox" bind:checked={eventForm.allDay} /></label>
        <label>Group ID <input bind:value={eventForm.groupId} /></label>
        <label>URL <input bind:value={eventForm.url} /></label>
        <label>Description <textarea bind:value={eventForm.description}></textarea></label>
        <div class="actions">
          <button type="submit">{eventForm.id ? 'Save' : 'Add Event'}</button>
          {#if eventForm.id}
            <button type="button" onclick={resetEvent}>Cancel</button>
          {/if}
        </div>
      </form>

      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Start</th>
            <th>End</th>
            <th>Description</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each events as event (event.id)}
            <tr>
              <td>{event.title}</td>
              <td>{event.start}</td>
              <td>{event.end ?? ''}</td>
              <td>{event.extendedProps?.description ?? ''}</td>
              <td class="row-actions">
                <button onclick={() => editEvent(event)}>Edit</button>
                <button class="danger" onclick={() => deleteEvent(event)}>Delete</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {:else}
    <section>
      <h2>{printerForm.id ? 'Edit Printer' : 'New Printer'}</h2>
      <form onsubmit={(e) => { e.preventDefault(); printerForm.originalId ? updatePrinter() : createPrinter() }}>
        <label>ID <input bind:value={printerForm.id} disabled={!!printerForm.originalId} /></label>
        <label>Name <input bind:value={printerForm.name} /></label>
        <label>Image URL <input bind:value={printerForm.imageUrl} /></label>
        <label>IP <input bind:value={printerForm.ip} /></label>
        <label>Serial <input bind:value={printerForm.serial} /></label>
        <label>Access Code <input bind:value={printerForm.accessCode} /></label>
        <div class="actions">
          <button type="submit">{printerForm.originalId ? 'Save' : 'Add Printer'}</button>
          {#if printerForm.originalId}
            <button type="button" onclick={resetPrinter}>Cancel</button>
          {/if}
        </div>
      </form>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Image</th>
            <th>IP</th>
            <th>Serial</th>
            <th>Access Code</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each printers as printer (printer.id)}
            <tr>
              <td>{printer.id}</td>
              <td>{printer.name}</td>
              <td>{printer.imageUrl ?? ''}</td>
              <td>{printer.ip ?? ''}</td>
              <td>{printer.serial ?? ''}</td>
              <td>{printer.accessCode ? `••••${printer.accessCode.slice(-4)}` : ''}</td>
              <td class="row-actions">
                <button onclick={() => editPrinter(printer)}>Edit</button>
                <button class="danger" onclick={() => deletePrinter(printer)}>Delete</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}
  {/if}
</main>

<style>
  main {
    max-width: 1000px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }

  h1 {
    margin: 0;
    font-size: 32px;
  }

  .subtitle {
    margin: 8px 0 24px;
    color: #64748b;
  }

  .status-note {
    color: #64748b;
    font-style: italic;
  }

  .status-note.error {
    color: #dc2626;
  }

  .login-card {
    max-width: 360px;
    padding: 24px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
  }

  .login-card form {
    border: none;
    padding: 0;
    margin: 16px 0 0;
    grid-template-columns: 1fr;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .signed-in {
    color: #64748b;
    font-size: 14px;
  }

  button.ghost {
    background: #fff;
    color: #2563eb;
    border: 1px solid #e2e8f0;
  }

  .tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
  }

  .tabs button {
    padding: 8px 16px;
    border: 1px solid #e2e8f0;
    background: #fff;
    color: #334155;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }

  .tabs button:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .tabs button.active {
    background: #2563eb;
    color: #fff;
    border-color: #2563eb;
    font-weight: 600;
  }

  form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
    padding: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
    margin-bottom: 24px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: #475569;
  }

  label.checkbox {
    flex-direction: row;
    align-items: center;
    align-self: end;
  }

  input,
  textarea {
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
  }

  textarea {
    resize: vertical;
    min-height: 60px;
  }

  .actions {
    display: flex;
    gap: 8px;
    align-items: end;
  }

  button {
    padding: 8px 14px;
    border: none;
    border-radius: 8px;
    background: #2563eb;
    color: #fff;
    cursor: pointer;
    font-size: 14px;
  }

  button.danger {
    background: #dc2626;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
  }

  th,
  td {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 14px;
  }

  th {
    background: #f8fafc;
    color: #475569;
  }

  .row-actions {
    white-space: nowrap;
    text-align: right;
  }

  .row-actions button {
    margin-left: 6px;
    padding: 4px 10px;
    font-size: 13px;
  }
</style>