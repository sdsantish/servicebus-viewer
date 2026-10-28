import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Editor from '@monaco-editor/react'
import { Activity, ArrowDownToLine, ArrowUpFromLine, Boxes, ChevronDown, Circle, RefreshCw, Send, Wifi } from 'lucide-react'
import { io } from 'socket.io-client'
import { toast, Toaster } from 'sonner'

type Entity = { name: string; type: 'queue' | 'topic'; subscriptions: string[] }
type Target = { entityType: Entity['type']; entityName: string; subscriptionName?: string }
type Message = { messageId: string; body: unknown; contentType?: string; enqueuedTimeUtc?: string; sequenceNumber?: string }

const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(body?.message ?? `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

function App() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Target | null>(null)
  const [payload, setPayload] = useState('{\n  \n}')
  const [liveMessages, setLiveMessages] = useState<Message[] | null>(null)
  const entitiesQuery = useQuery({ queryKey: ['entities'], queryFn: () => api<Entity[]>('/api/entities'), refetchInterval: 10000 })
  const targetKey = ['messages', selected]
  const messagesQuery = useQuery({
    queryKey: targetKey,
    queryFn: () => api<Message[]>('/api/messages/peek', { method: 'POST', body: JSON.stringify({ ...selected, maxMessages: 50 }) }),
    enabled: !!selected,
  })
  const sendMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Select an entity first')
      let body: unknown
      try {
        body = JSON.parse(payload)
      } catch {
        throw new Error('The message body must be valid JSON')
      }
      return api<{ messageId: string }>('/api/messages/send', { method: 'POST', body: JSON.stringify({ ...selected, body }) })
    },
    onSuccess: () => {
      toast.success('Message sent')
      void queryClient.invalidateQueries({ queryKey: targetKey })
    },
    onError: (error) => toast.error(error.message),
  })

  useEffect(() => {
    if (!selected) {
      setLiveMessages(null)
      return
    }
    const socket = io({ transports: ['websocket', 'polling'] })
    socket.on('connect', () => socket.emit('watch', selected))
    socket.on('messages', (messages: Message[]) => setLiveMessages(messages))
    socket.on('stream-error', (error: { message: string }) => toast.error(error.message))
    return () => {
      socket.disconnect()
      setLiveMessages(null)
    }
  }, [selected])

  const entities = entitiesQuery.data ?? []
  const selectedEntity = entities.find((entity) => entity.name === selected?.entityName && entity.type === selected.entityType)
  const messages = liveMessages ?? messagesQuery.data ?? []
  const queues = useMemo(() => entities.filter((entity) => entity.type === 'queue'), [entities])
  const topics = useMemo(() => entities.filter((entity) => entity.type === 'topic'), [entities])
  const selectEntity = (entity: Entity, subscriptionName?: string) => {
    setSelected({ entityType: entity.type, entityName: entity.name, subscriptionName })
    setLiveMessages(null)
  }

  return (
    <div className="app-shell">
      <Toaster theme="dark" position="bottom-right" />
      <aside className="sidebar">
        <div className="brand"><div className="brand-icon"><Activity size={19} /></div><div><strong>Buswatch</strong><span>LOCAL SERVICE BUS</span></div></div>
        <div className="namespace"><span className="namespace-dot" /><div><small>NAMESPACE</small><strong>{entities.length ? 'Local emulator' : 'Discovering...'}</strong></div><ChevronDown size={15} /></div>
        <div className="nav-heading"><span>MESSAGING</span><button aria-label="Refresh entities" onClick={() => void entitiesQuery.refetch()}><RefreshCw size={14} /></button></div>
        {entitiesQuery.isError && <div className="sidebar-error">{entitiesQuery.error.message}</div>}
        <div className="entity-list">
          {queues.length > 0 && <div className="section-title"><Boxes size={14} /> QUEUES <span>{queues.length}</span></div>}
          {queues.map((entity) => <button key={`queue:${entity.name}`} className={`entity-button ${selected?.entityName === entity.name && selected.entityType === 'queue' ? 'active' : ''}`} onClick={() => selectEntity(entity)}><span className="entity-dot queue-dot" />{entity.name}</button>)}
          {topics.length > 0 && <div className="section-title topics-title"><Boxes size={14} /> TOPICS <span>{topics.length}</span></div>}
          {topics.map((entity) => <div key={`topic:${entity.name}`}><button className={`entity-button ${selected?.entityName === entity.name && selected.entityType === 'topic' ? 'active' : ''}`} onClick={() => selectEntity(entity, entity.subscriptions[0])}><span className="entity-dot topic-dot" />{entity.name}</button>{entity.subscriptions.map((sub) => <button key={sub} className={`subscription-button ${selected?.entityName === entity.name && selected.subscriptionName === sub ? 'active' : ''}`} onClick={() => selectEntity(entity, sub)}><span>↳</span>{sub}</button>)}</div>)}
          {entitiesQuery.isSuccess && entities.length === 0 && <p className="empty-sidebar">No entities in config.json</p>}
        </div>
        <div className="sidebar-footer"><span className="online-indicator" /> Emulator connection configured</div>
      </aside>

      <main className="main-panel">
        <header className="topbar"><div className="breadcrumbs"><span>Service Bus</span><span className="crumb-slash">/</span><strong>{selected?.entityName ?? 'Overview'}</strong>{selected?.subscriptionName && <><span className="crumb-slash">/</span><strong className="sub-crumb">{selected.subscriptionName}</strong></>}</div><div className="connection-status"><Wifi size={15} /><span>LOCAL</span><span className="connection-dot" /></div></header>
        <div className="workspace">
          {!selected ? (
            <section className="welcome">
              <div className="welcome-icon"><Activity size={26} /></div>
              <span className="eyebrow">SERVICE BUS EXPLORER</span><h1>Message flow,<br /><span>in plain sight.</span></h1>
              <p>Select a queue or topic from the sidebar to inspect and publish messages. Entity discovery is generated from your emulator configuration.</p>
              {entitiesQuery.isError && <div className="error-banner">{entitiesQuery.error.message}</div>}
              <div className="overview-stats"><div><strong>{queues.length}</strong><span>QUEUES</span></div><div><strong>{topics.length}</strong><span>TOPICS</span></div><div><strong>{topics.reduce((count, topic) => count + topic.subscriptions.length, 0)}</strong><span>SUBSCRIPTIONS</span></div></div>
            </section>
          ) : (
            <>
              <div className="page-heading"><div><div className="eyebrow">{selectedEntity?.type.toUpperCase()} {selected.subscriptionName ? '· SUBSCRIPTION' : ''}</div><h1>{selected.subscriptionName ?? selected.entityName}</h1><p>{selected.subscriptionName ? `${selected.entityName} / ${selected.subscriptionName}` : 'Inspect messages or publish a test payload.'}</p></div><button className="refresh-button" onClick={() => void messagesQuery.refetch()}><RefreshCw size={15} /> Refresh</button></div>
              <div className="content-grid">
                <section className="panel messages-panel"><div className="panel-header"><div className="panel-title"><ArrowDownToLine size={16} /><h2>Messages</h2><span className="count-pill">{messages.length}</span></div><div className="live-tag"><span /> LIVE</div></div>
                  {messagesQuery.isError && <div className="panel-error">{messagesQuery.error.message}</div>}
                  {messagesQuery.isPending && !liveMessages ? <div className="message-empty">Connecting to the entity…</div> : messages.length === 0 ? <div className="message-empty"><Circle size={20} /><strong>No messages available</strong><span>Messages will appear here as they arrive.</span></div> : <div className="message-list">{messages.map((message, index) => <details className="message-card" key={`${message.messageId}-${index}`} open={index === 0}><summary><span className="message-number">#{message.sequenceNumber ?? index + 1}</span><span className="message-id">{message.messageId}</span><span className="message-time">{message.enqueuedTimeUtc ? new Date(message.enqueuedTimeUtc).toLocaleTimeString() : ''}</span></summary><div className="message-body"><Editor height="220px" language={message.contentType?.includes('json') ? 'json' : 'plaintext'} value={JSON.stringify(message.body, null, 2)} theme="vs-dark" options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false, fontSize: 12, padding: { top: 12 } }} /></div></details>)}</div>}
                </section>
                <section className="panel send-panel"><div className="panel-header"><div className="panel-title"><ArrowUpFromLine size={16} /><h2>Send message</h2></div></div><p className="send-description">Publish a JSON payload to <strong>{selected.entityName}</strong>.</p><div className="editor-label"><span>BODY</span><span>JSON</span></div><div className="payload-editor"><Editor height="260px" language="json" value={payload} onChange={(value) => setPayload(value ?? '')} theme="vs-dark" options={{ minimap: { enabled: false }, scrollBeyondLastLine: false, fontSize: 12, padding: { top: 14 }, tabSize: 2 }} /></div><button className="send-button" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}><Send size={15} />{sendMutation.isPending ? 'Sending…' : 'Send message'}</button><div className="send-note">Message is sent without consuming existing messages.</div></section>
              </div>
            </>
          )}
        </div>
        <footer className="statusbar"><span><span className="status-dot" /> Connected to emulator</span><span>Refreshes automatically</span></footer>
      </main>
    </div>
  )
}

export default App
