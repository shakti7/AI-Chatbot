import { useState } from 'react'

export default function ArtifactPanel({ artifact }) {
  const [view, setView] = useState('code')

  if (!artifact) {
    return <div className="text-neutral-500 text-sm">No artifact yet</div>
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content)
    } catch {}
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div className="font-medium">Generated Artifact</div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded overflow-hidden border border-neutral-300 dark:border-neutral-700">
            <button onClick={() => setView('code')} className={`px-3 py-1 text-sm ${view === 'code' ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}>Code</button>
            <button onClick={() => setView('preview')} className={`px-3 py-1 text-sm ${view === 'preview' ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}>Preview</button>
          </div>
          <button onClick={copy} className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700">Copy</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {view === 'code' ? (
          <pre className="text-xs bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded p-3 overflow-auto"><code>{artifact.content}</code></pre>
        ) : (
          <iframe className="w-full h-full bg-white rounded" sandbox="allow-scripts allow-same-origin" srcDoc={htmlPreviewDoc(artifact.content)} />
        )}
      </div>
    </div>
  )
}

function htmlPreviewDoc(code) {
  const hasHtml = /<html[\s\S]*<\/html>/.test(code)
  return hasHtml
    ? code
    : `<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'><style>body{font-family:Inter,ui-sans-serif,system-ui;margin:16px}</style></head><body>${code}</body></html>`
}
