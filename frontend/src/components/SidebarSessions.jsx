import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { deleteSession, renameSession, selectSession, startNewDraft } from '../store/sessionsSlice'

export default function SidebarSessions({ sessions, order, currentId, onNew, onSelect }) {
  const dispatch = useDispatch()
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [editingTitleId, setEditingTitleId] = useState(null)
  const [tempTitle, setTempTitle] = useState('')
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => {
            setMenuOpenId(null)
            setEditingTitleId(null)
            // Do not create a session immediately. Switch to draft state.
            dispatch(startNewDraft())
          }}
          className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-left"
        >
          + New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {order.length === 0 && (
          <div className="p-3 text-sm text-neutral-500">No chats yet</div>
        )}
        <ul className="p-2 space-y-1">
          {order.map((id) => {
            const s = sessions[id]
            const active = id === currentId
            return (
              <li key={id} className="relative group">
                <div
                  className={`w-full px-3 py-2 rounded border flex items-center justify-between gap-2 ${
                    active
                      ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700'
                      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <button onClick={() => onSelect(id)} className="flex-1 min-w-0 text-left">
                    {editingTitleId === id ? (
                      <input
                        autoFocus
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        onBlur={() => {
                          dispatch(renameSession({ id, title: tempTitle.trim() || s.title }))
                          setEditingTitleId(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            dispatch(renameSession({ id, title: tempTitle.trim() || s.title }))
                            setEditingTitleId(null)
                          }
                        }}
                        className="w-full min-w-0 bg-transparent outline-none text-sm font-semibold truncate"
                      />
                    ) : (
                      <div className="truncate text-sm font-semibold">{s.title || 'Untitled'}</div>
                    )}
                  </button>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === id ? null : id)}
                      className="px-2 py-1 text-neutral-500 hover:text-neutral-300 font-semibold"
                      title="More"
                    >
                      ⋯
                    </button>
                  </div>

                  {menuOpenId === id && (
                    <div className="absolute right-2 top-10 z-10 bg-neutral-900 text-neutral-100 border border-neutral-700 rounded shadow-lg w-40">
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-neutral-800"
                        onClick={() => {
                          setMenuOpenId(null)
                          setEditingTitleId(id)
                          setTempTitle(s.title || 'Untitled')
                        }}
                      >Rename</button>
                      <button
                        className="w-full text-left px-3 py-2 text-red-400 hover:bg-neutral-800"
                        onClick={() => {
                          setMenuOpenId(null)
                          dispatch(deleteSession(id))
                        }}
                      >Delete</button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        {order.length === 0 && (
          <div className="px-3 py-6 text-xs text-neutral-500">Start a new chat</div>
        )}
      </div>
    </div>
  )
}
