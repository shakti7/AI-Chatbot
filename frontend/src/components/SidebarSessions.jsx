export default function SidebarSessions({ sessions, order, currentId, onNew, onSelect }) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={onNew}
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
              <li key={id}>
                <button
                  onClick={() => onSelect(id)}
                  className={`w-full text-left px-3 py-2 rounded border ${
                    active
                      ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700'
                      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="truncate text-sm font-medium">{s.title || 'Untitled'}</div>
                  {s.messages?.length ? (
                    <div className="truncate text-xs text-neutral-500 mt-0.5">
                      {s.messages[s.messages.length - 1]?.content || ''}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-400">No messages</div>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
