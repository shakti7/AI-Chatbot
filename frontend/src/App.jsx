import { useMemo, useRef, useState } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { store } from './store/store'
import ThemeToggle from './components/ThemeToggle'
import TypingLoader from './components/TypingLoader'
import ArtifactPanel from './components/ArtifactPanel'
import SidebarSessions from './components/SidebarSessions'
import MessageMarkdown from './components/MessageMarkdown'
import { connectSSE } from './lib/sse'
import {
  newSession,
  selectSession,
  addMessage,
  setStreaming,
  appendAssistantChunk,
  setLatestArtifact,
  setViewPairIndex,
  editUserMessage,
} from './store/sessionsSlice'
import './index.css'

function useBackendUrl() {
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
}

function Root() {
  return (
    <Provider store={store}>
      <App />
    </Provider>
  )
}

export default Root

function App() {
  const dispatch = useDispatch()
  const backend = useBackendUrl()
  const { sessions, currentId, order } = useSelector((s) => s.sessions)
  const session = sessions[currentId]
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [input, setInput] = useState('')
  const abortRef = useRef(null)

  const canOpenSidebar = !!session?.latestArtifact

  const shownMessages = useMemo(() => {
    if (!session) return []
    if (session.viewPairIndex == null) return session.messages
    const targetPairs = session.viewPairIndex + 1
    const result = []
    let userCount = 0
    for (const m of session.messages) {
      result.push(m)
      if (m.role === 'assistant') {
        if (userCount >= targetPairs) break
      }
      if (m.role === 'user') userCount += 1
    }
    return result
  }, [session])

  function sendMessage(text) {
    const content = (text ?? input).trim()
    if (!content || session.streaming) return

    dispatch(addMessage({ sessionId: session.id, role: 'user', content }))
    setInput('')
    dispatch(setStreaming({ sessionId: session.id, streaming: true }))
    dispatch(appendAssistantChunk({ sessionId: session.id, text: '' }))

    const url = `${backend}/api/chat/stream`
    abortRef.current = connectSSE(
      url,
      { session_id: session.id, message: content },
      {
        onChunk: (t) => dispatch(appendAssistantChunk({ sessionId: session.id, text: t })),
        onArtifact: (a) => dispatch(setLatestArtifact({ sessionId: session.id, artifact: a })),
        onDone: () => dispatch(setStreaming({ sessionId: session.id, streaming: false })),
        onError: (m) => {
          dispatch(setStreaming({ sessionId: session.id, streaming: false }))
          dispatch(appendAssistantChunk({ sessionId: session.id, text: `\n[Error] ${m}` }))
        },
      },
    )
  }

  function stopStream() {
    abortRef.current && abortRef.current()
    dispatch(setStreaming({ sessionId: session.id, streaming: false }))
  }

  function onEditUserMessage(messageId) {
    const newContent = prompt('Edit your question:')
    if (!newContent) return
    dispatch(editUserMessage({ sessionId: session.id, messageId, newContent, branchNewSession: true }))
    setTimeout(() => {
      const state = store.getState().sessions
      const current = state.sessions[state.currentId]
      sendMessage(current.messages[current.messages.length - 1].content)
    }, 0)
  }

  const pairCount = useMemo(() => {
    if (!session) return 0
    return session.messages.filter((m) => m.role === 'user').length
  }, [session])

  const currentIndex = session?.viewPairIndex ?? (pairCount ? pairCount - 1 : 0)
  const showPrevNext = pairCount > 1
  const canPrev = currentIndex > 0
  const canNext = currentIndex < pairCount - 1

  return (
    <div className="h-screen w-screen flex bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Left sidebar like GPT */}
      <aside className="w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40">
        <SidebarSessions
          sessions={sessions}
          order={order}
          currentId={currentId}
          onNew={() => dispatch(newSession({}))}
          onSelect={(id) => dispatch(selectSession(id))}
        />
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="border-b border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="text-base font-semibold tracking-tight">Zocket CodeMate</div>
            {showPrevNext && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => canPrev && dispatch(setViewPairIndex({ sessionId: session.id, index: Math.max(0, currentIndex - 1) }))}
                  disabled={!canPrev}
                  className={`px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 ${!canPrev ? 'opacity-40 cursor-not-allowed' : ''}`}
                >Prev</button>
                <button
                  onClick={() => canNext && dispatch(setViewPairIndex({ sessionId: session.id, index: Math.min(pairCount - 1, currentIndex + 1) }))}
                  disabled={!canNext}
                  className={`px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 ${!canNext ? 'opacity-40 cursor-not-allowed' : ''}`}
                >Next</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canOpenSidebar && (
              <button onClick={() => setSidebarOpen((s) => !s)} className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                {sidebarOpen ? 'Hide' : 'View'} Generated Artifact
              </button>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex">
          <section className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto w-full max-w-3xl space-y-6">
              {shownMessages.map((m, idx) => {
                const isLast = idx === shownMessages.length - 1
                const showLoaderInBlock = m.role === 'assistant' && isLast && session.streaming
                return (
                  <div key={m.id} className="w-full">
                    <div className={`text-xs mb-1 ${m.role === 'user' ? 'text-blue-600 dark:text-blue-300' : 'text-emerald-600 dark:text-emerald-300'}`}>{m.role}</div>
                    <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded p-3">
                      <MessageMarkdown text={m.content} />
                      {showLoaderInBlock && (
                        <div className="mt-2"><TypingLoader /></div>
                      )}
                    </div>
                    {m.role === 'user' && (
                      <button onClick={() => onEditUserMessage(m.id)} className="mt-1 text-xs underline text-neutral-500">Edit</button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <aside className={`${sidebarOpen ? 'w-[42%]' : 'w-0'} transition-all duration-200 border-l border-neutral-200 dark:border-neutral-800 overflow-hidden`}>
            <ArtifactPanel artifact={session.latestArtifact} />
          </aside>
        </main>

        <footer className="border-t border-neutral-200 dark:border-neutral-800 p-4">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-3xl flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask to build code..."
                className="flex-1 px-3 py-2 rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 outline-none focus:ring-2 focus:ring-emerald-600"
              />
              {!session.streaming && (
                <button onClick={() => sendMessage()} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white">Send</button>
              )}
              {session.streaming && (
                <button onClick={stopStream} className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white">Stop</button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
