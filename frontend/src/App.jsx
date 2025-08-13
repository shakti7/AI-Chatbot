import { useMemo, useRef, useState, useEffect } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { store } from './store/store'
import ThemeToggle from './components/ThemeToggle'
import TypingLoader from './components/TypingLoader'
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
  const [input, setInput] = useState('')
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const abortRef = useRef(null)

  // Ensure there's always a valid session available
  useEffect(() => {
    if (!session) {
      dispatch(newSession({}))
    }
  }, [session, dispatch])

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

  function sendMessageTo(targetSessionId, text) {
    const content = (text ?? input).trim()
    if (!content) return

    const currentSessions = store.getState().sessions.sessions
    const targetSession = currentSessions[targetSessionId]
    if (!targetSession || targetSession.streaming) return

    dispatch(addMessage({ sessionId: targetSessionId, role: 'user', content }))
    setInput('')
    dispatch(setStreaming({ sessionId: targetSessionId, streaming: true }))
    dispatch(appendAssistantChunk({ sessionId: targetSessionId, text: '' }))

    const url = `${backend}/api/chat/stream`
    abortRef.current = connectSSE(
      url,
      { session_id: targetSessionId, message: content },
      {
        onChunk: (t) => dispatch(appendAssistantChunk({ sessionId: targetSessionId, text: t })),
        onArtifact: (a) => {
          dispatch(setLatestArtifact({ sessionId: targetSessionId, artifact: a }))
        },
        onDone: () => dispatch(setStreaming({ sessionId: targetSessionId, streaming: false })),
        onError: (m) => {
          dispatch(setStreaming({ sessionId: targetSessionId, streaming: false }))
          dispatch(appendAssistantChunk({ sessionId: targetSessionId, text: `\n[Error] ${m}` }))
        },
      },
    )
  }

  function streamAssistantForText(targetSessionId, text) {
    const content = text.trim()
    if (!content) return

    const currentSessions = store.getState().sessions.sessions
    const targetSession = currentSessions[targetSessionId]
    if (!targetSession || targetSession.streaming) return

    dispatch(setStreaming({ sessionId: targetSessionId, streaming: true }))
    dispatch(appendAssistantChunk({ sessionId: targetSessionId, text: '' }))

    const url = `${backend}/api/chat/stream`
    abortRef.current = connectSSE(
      url,
      { session_id: targetSessionId, message: content },
      {
        onChunk: (t) => dispatch(appendAssistantChunk({ sessionId: targetSessionId, text: t })),
        onArtifact: (a) => dispatch(setLatestArtifact({ sessionId: targetSessionId, artifact: a })),
        onDone: () => dispatch(setStreaming({ sessionId: targetSessionId, streaming: false })),
        onError: (m) => {
          dispatch(setStreaming({ sessionId: targetSessionId, streaming: false }))
          dispatch(appendAssistantChunk({ sessionId: targetSessionId, text: `\n[Error] ${m}` }))
        },
      },
    )
  }

  function sendMessage(text) {
    if (!session) return
    sendMessageTo(session.id, text)
  }

  function stopStream() {
    abortRef.current && abortRef.current()
    dispatch(setStreaming({ sessionId: session.id, streaming: false }))
  }

  function onEditUserMessage(messageId) {
    if (!session) return
    const msg = session.messages.find((m) => m.id === messageId)
    if (!msg) return
    setEditingText(msg.content)
    setEditingMessageId(messageId)
  }

  function cancelEdit() {
    setEditingMessageId(null)
    setEditingText('')
  }

  function confirmEdit() {
    if (!editingMessageId || !session) return
    const newContent = editingText.trim()
    if (!newContent) return
    dispatch(editUserMessage({ sessionId: session.id, messageId: editingMessageId, newContent, branchNewSession: false }))
    // After in-place edit (which truncates following messages), stream assistant response for the edited text
    setEditingMessageId(null)
    setEditingText('')
    setTimeout(() => {
      streamAssistantForText(session.id, newContent)
    }, 0)
  }



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
            <button 
              onClick={() => window.location.reload()} 
              className="text-base font-semibold tracking-tight hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Zocket CodeMate
            </button>
          </div>
          <div className="flex items-center gap-2">
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
                      {m.role === 'user' && editingMessageId === m.id ? (
                        <div>
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmEdit() }
                            }}
                            className="w-full px-3 py-2 rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 outline-none focus:ring-2 focus:ring-emerald-600 resize-y min-h-[44px]"
                            placeholder="Edit your question..."
                          />
                          <div className="mt-2 flex items-center justify-end gap-2">
                            <button onClick={cancelEdit} className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-200">Cancel</button>
                            <button onClick={confirmEdit} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white">Send</button>
                          </div>
                        </div>
                      ) : (
                        <MessageMarkdown text={m.content} />
                      )}
                      {showLoaderInBlock && (
                        <div className="mt-2"><TypingLoader /></div>
                      )}
                    </div>
                    {m.role === 'user' && editingMessageId !== m.id && (
                      <button onClick={() => onEditUserMessage(m.id)} className="mt-1 text-xs underline text-neutral-500">Edit</button>
                    )}
                  </div>
                )}
              )}
            </div>
          </section>
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
