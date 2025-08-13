export function connectSSE(url, body, handlers) {
  const ctrl = new AbortController()
  async function run() {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })
      if (!resp.ok || !resp.body) {
        handlers.onError && handlers.onError(`HTTP ${resp.status}`)
        return
      }
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let idx
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const event = parseSSE(rawEvent)
          if (!event) continue
          const data = event.data ? safeJson(event.data) : null
          if (data && data.type === 'chunk' && typeof data.text === 'string') {
            handlers.onChunk && handlers.onChunk(data.text)
          } else if (event.event === 'artifact' && data && data.artifact) {
            handlers.onArtifact && handlers.onArtifact(data.artifact)
          } else if (data && data.type === 'done') {
            handlers.onDone && handlers.onDone()
          } else if (data && data.type === 'error') {
            handlers.onError && handlers.onError(data.message || 'Unknown error')
          }
        }
      }
      handlers.onDone && handlers.onDone()
    } catch (e) {
      if (e && e.name !== 'AbortError') {
        handlers.onError && handlers.onError(String(e.message || e))
      }
    }
  }
  run()
  return () => ctrl.abort()
}

function parseSSE(src) {
  const lines = src.split('\n')
  let event
  const dataLines = []
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  const data = dataLines.length ? dataLines.join('\n') : undefined
  return { event, data }
}

function safeJson(s) {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}


