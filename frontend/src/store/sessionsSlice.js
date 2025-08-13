import { createSlice, nanoid } from '@reduxjs/toolkit'

const persisted = (() => {
  try {
    const raw = localStorage.getItem('zocket:sessions')
    if (!raw) return null
    
    const parsed = JSON.parse(raw)
    // Validate that the persisted data has the required structure
    if (parsed && 
        parsed.sessions && 
        parsed.order && 
        parsed.currentId && 
        parsed.sessions[parsed.currentId] &&
        Array.isArray(parsed.order) &&
        parsed.order.length > 0) {
      return parsed
    }
    return null
  } catch {
    return null
  }
})()

const createSession = (title = 'New Chat') => ({
  id: nanoid(),
  title,
  messages: [],
  streaming: false,
  latestArtifact: null,
  viewPairIndex: null, // null means show all
  history: [], // array of previous message lists (snapshots before edits)
  historyCursor: null, // null = current; 0..history.length-1 indexes history
  historyAnchorMessageId: null, // assistant message id created by latest edit
})

function normalizePersistedState(state) {
  if (!state) return null
  const cleanedOrder = (state.order || []).filter((id) => {
    const s = state.sessions?.[id]
    return s && Array.isArray(s.messages) && s.messages.length > 0
  })
  if (cleanedOrder.length === 0) return null
  const currentId = cleanedOrder.includes(state.currentId) ? state.currentId : cleanedOrder[0]
  const cleanedSessions = {}
  for (const id of cleanedOrder) cleanedSessions[id] = state.sessions[id]
  return { sessions: cleanedSessions, order: cleanedOrder, currentId }
}

const initialState = normalizePersistedState(persisted) || {
  sessions: {},
  order: [],
  currentId: null,
}

const slice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    startNewDraft(state) {
      const prevId = state.currentId
      // If the previous session is empty, remove it from the list
      if (prevId) {
        const prev = state.sessions[prevId]
        if (prev && (!prev.messages || prev.messages.length === 0)) {
          delete state.sessions[prevId]
          state.order = state.order.filter((id) => id !== prevId)
        }
      }
      state.currentId = null
    },
    newSession(state, action) {
      const title = action.payload?.title || 'New Chat'
      const current = state.sessions[state.currentId]
      // If the current session exists and has no messages, reuse it instead of creating another empty session
      if (current && (!current.messages || current.messages.length === 0)) {
        current.title = current.title || title
        return
      }
      const s = createSession(title)
      state.sessions[s.id] = s
      state.order.unshift(s.id)
      state.currentId = s.id
    },
    renameSession(state, action) {
      const { id, title } = action.payload
      const s = state.sessions[id]
      if (s) s.title = title || s.title
    },
    deleteSession(state, action) {
      const id = action.payload
      if (!state.sessions[id]) return
      delete state.sessions[id]
      state.order = state.order.filter((x) => x !== id)
      if (state.currentId === id) {
        const nextId = state.order[0] || null
        state.currentId = nextId
      }
    },
    selectSession(state, action) {
      const nextId = action.payload
      if (!state.sessions[nextId]) return
      const prevId = state.currentId
      if (prevId && prevId !== nextId) {
        const prev = state.sessions[prevId]
        if (prev && (!prev.messages || prev.messages.length === 0)) {
          delete state.sessions[prevId]
          state.order = state.order.filter((id) => id !== prevId)
        }
      }
      state.currentId = nextId
    },
    addMessage(state, action) {
      const { sessionId, role, content } = action.payload
      const s = state.sessions[sessionId]
      if (!s) return
      s.messages.push({ id: nanoid(), role, content })
      if (role === 'user' && s.messages.length === 1) {
        s.title = content.slice(0, 48)
      }
    },
    setStreaming(state, action) {
      const { sessionId, streaming } = action.payload
      const s = state.sessions[sessionId]
      if (s) s.streaming = streaming
    },
    appendAssistantChunk(state, action) {
      const { sessionId, text } = action.payload
      const s = state.sessions[sessionId]
      if (!s) return
      const last = s.messages[s.messages.length - 1]
      if (last && last.role === 'assistant') last.content += text
      else s.messages.push({ id: nanoid(), role: 'assistant', content: text })
    },
    setLatestArtifact(state, action) {
      const { sessionId, artifact } = action.payload
      const s = state.sessions[sessionId]
      if (s) s.latestArtifact = artifact
    },
    resetSession(state, action) {
      const id = action.payload
      const s = state.sessions[id]
      if (!s) return
      s.messages = []
      s.latestArtifact = null
      s.viewPairIndex = null
      s.history = []
      s.historyCursor = null
      s.historyAnchorMessageId = null
    },
    setViewPairIndex(state, action) {
      const { sessionId, index } = action.payload
      const s = state.sessions[sessionId]
      if (s) s.viewPairIndex = index
    },
    editUserMessage(state, action) {
      const { sessionId, messageId, newContent, branchNewSession } = action.payload
      const s = state.sessions[sessionId]
      if (!s) return
      const idx = s.messages.findIndex((m) => m.id === messageId)
      if (idx === -1) return
      // Ensure it is a user message
      if (s.messages[idx].role !== 'user') return
      if (branchNewSession) {
        // branch to a new session with messages prior to idx
        const branched = createSession(s.title + ' (edited)')
        branched.messages = s.messages.slice(0, idx)
        // add edited message as new last user message
        branched.messages.push({ id: nanoid(), role: 'user', content: newContent })
        state.sessions[branched.id] = branched
        state.order.unshift(branched.id)
        state.currentId = branched.id
      } else {
        // in-place edit and truncate following messages
        // push snapshot of the current conversation to history for back navigation
        try {
          const snapshot = JSON.parse(JSON.stringify(s.messages))
          s.history.push(snapshot)
        } catch {
          // if deep copy fails, skip history push
        }
        s.messages[idx].content = newContent
        s.messages = s.messages.slice(0, idx + 1)
        s.historyCursor = null
        s.historyAnchorMessageId = null
      }
    },
    setHistoryAnchorMessage(state, action) {
      const { sessionId, messageId } = action.payload
      const s = state.sessions[sessionId]
      if (!s) return
      s.historyAnchorMessageId = messageId || null
    },
    setHistoryCursor(state, action) {
      const { sessionId, cursor } = action.payload
      const s = state.sessions[sessionId]
      if (!s) return
      if (cursor == null) {
        s.historyCursor = null
        return
      }
      const max = s.history.length - 1
      s.historyCursor = Math.max(0, Math.min(max, cursor))
    },
  },
})

export const {
  newSession,
  selectSession,
  addMessage,
  setStreaming,
  appendAssistantChunk,
  setLatestArtifact,
  resetSession,
  setViewPairIndex,
  editUserMessage,
  setHistoryCursor,
  setHistoryAnchorMessage,
  renameSession,
  deleteSession,
  startNewDraft,
} = slice.actions

export default slice.reducer
