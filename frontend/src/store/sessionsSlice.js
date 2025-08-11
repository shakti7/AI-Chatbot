import { createSlice, nanoid } from '@reduxjs/toolkit'

const persisted = (() => {
  try {
    const raw = localStorage.getItem('zocket:sessions')
    return raw ? JSON.parse(raw) : null
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
})

const initialSession = createSession()

const initialState = persisted || {
  sessions: { [initialSession.id]: initialSession },
  order: [initialSession.id],
  currentId: initialSession.id,
}

const slice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    newSession(state, action) {
      const title = action.payload?.title || 'New Chat'
      const s = createSession(title)
      state.sessions[s.id] = s
      state.order.unshift(s.id)
      state.currentId = s.id
    },
    selectSession(state, action) {
      const id = action.payload
      if (state.sessions[id]) state.currentId = id
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
        s.messages[idx].content = newContent
        s.messages = s.messages.slice(0, idx + 1)
      }
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
} = slice.actions

export default slice.reducer
