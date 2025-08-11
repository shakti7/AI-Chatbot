import { configureStore } from '@reduxjs/toolkit'
import sessionsReducer from './sessionsSlice'

const store = configureStore({
  reducer: {
    sessions: sessionsReducer,
  },
})

store.subscribe(() => {
  try {
    const state = store.getState()
    localStorage.setItem('zocket:sessions', JSON.stringify(state))
  } catch {}
})

export { store }
