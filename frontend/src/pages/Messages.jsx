import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';

const initials = (name) => {
  const parts = String(name || '').trim().split(/\s+/);
  const a = (parts[0]?.[0] || 'U').toUpperCase();
  const b = (parts[1]?.[0] || '').toUpperCase();
  return a + (b || a);
};

const timeLabel = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

const ROLE_COLORS = { STUDENT: '#0ea5e9', TUTOR: '#8b5cf6', PROVIDER: '#f59e0b', ADMIN: '#ef4444' };
const roleColor = (role) => ROLE_COLORS[role] || '#6b7280';

export default function Messages() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [onlineIds, setOnlineIds] = useState([]);
  const bottomRef = useRef(null);

  const activeId = Number(searchParams.get('with')) || null;
  const activeConversation = conversations.find((c) => c.otherId === activeId);
  const activeContact = contacts.find((c) => c.id === activeId);
  const chatUser = activeConversation
    ? { id: activeConversation.otherId, fullName: activeConversation.otherName, role: activeConversation.otherRole }
    : activeContact
      ? { id: activeContact.id, fullName: activeContact.fullName, role: activeContact.role }
      : null;

  const loadThreads = () => api.get('/messages/threads').then(({ data }) => {
    const mapped = data.map((t) => ({
      otherId: t.partner.id,
      otherName: t.partner.fullName,
      otherRole: t.partner.role,
      lastBody: t.lastMessage.body,
      lastTime: t.lastMessage.createdAt,
      unreadCount: t.unreadCount,
    }));
    setConversations(mapped);
    return mapped;
  });

  // keep a ref of the active id so the socket handler (registered once on mount) can read the latest value
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  useEffect(() => {
    loadThreads().then((mapped) => {
      if (!searchParams.get('with') && mapped.length > 0) {
        setSearchParams({ with: String(mapped[0].otherId) }, { replace: true });
      }
    });
    api.get('/messages/contacts').then(({ data }) => setContacts(data));

    const socket = getSocket();
    socket.emit('join', user.id);
    const onNewMessage = (msg) => {
      loadThreads();
      setMessages((prev) => {
        const isForActiveThread = activeIdRef.current && (msg.senderId === activeIdRef.current || msg.receiverId === activeIdRef.current);
        return isForActiveThread ? [...prev, msg] : prev;
      });
    };
    socket.on('new-message', onNewMessage);
    const onOnlineUsers = (ids) => setOnlineIds(ids.map(String));
    socket.on('online-users', onOnlineUsers);
    return () => {
      socket.off('new-message', onNewMessage);
      socket.off('online-users', onOnlineUsers);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    api.get(`/messages/thread/${activeId}`).then(({ data }) => setMessages(data));
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = (id) => setSearchParams({ with: String(id) });

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim() || !activeId) return;
    const { data } = await api.post('/messages', { receiverId: activeId, body });
    setMessages((prev) => [...prev, data]);
    getSocket().emit('send-message', { ...data, receiverId: activeId });
    setBody('');
    loadThreads();
  };

  const startConversation = (contactId) => {
    setShowModal(false);
    selectConversation(contactId);
  };

  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase();
    return c.fullName.toLowerCase().includes(q) || (c.companies || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="messages-grid">
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <h3>Conversations</h3>
            {contacts.length > 0 && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>➕ New</button>
            )}
          </div>
          <div style={{ maxHeight: 620, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>💬</div>
                <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>No conversations yet.</p>
                {contacts.length > 0 && (
                  <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>Start a Conversation</button>
                )}
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.otherId}
                  className="conversation-item"
                  style={{ background: activeId === c.otherId ? 'var(--cream)' : 'transparent', cursor: 'pointer' }}
                  onClick={() => selectConversation(c.otherId)}
                >
                  <div className="conversation-avatar">{initials(c.otherName)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <div style={{ fontWeight: 650, color: 'var(--text)' }}>{c.otherName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{timeLabel(c.lastTime)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.2rem' }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.otherRole ? `${c.otherRole[0]}${c.otherRole.slice(1).toLowerCase()}` : ''}{c.lastBody ? ` · ${c.lastBody}` : ''}
                      </div>
                      {c.unreadCount > 0 && <span className="badge badge-info" style={{ minWidth: 28, textAlign: 'center' }}>{c.unreadCount}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 620, marginBottom: 0 }}>
          <div className="panel-header" style={{ gap: '0.9rem', justifyContent: 'flex-start' }}>
            {chatUser ? (
              <>
                <div className="conversation-avatar" style={{ width: 42, height: 42 }}>{initials(chatUser.fullName)}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{chatUser.fullName}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    {chatUser.role ? `${chatUser.role[0]}${chatUser.role.slice(1).toLowerCase()}` : ''} · {onlineIds.includes(String(chatUser.id)) ? 'Online' : 'Offline'}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ fontWeight: 700 }}>Select a conversation</div>
            )}
          </div>

          <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {!chatUser ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
                Choose a conversation from the left
                {contacts.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>Start a Conversation</button>
                  </div>
                )}
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>No messages yet. Say hi 👋</div>
            ) : (
              <>
                {messages.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: m.senderId === user.id ? 'flex-end' : 'flex-start', marginBottom: '0.9rem' }}>
                    <div className={`chat-bubble ${m.senderId === user.id ? 'mine' : 'theirs'}`}>
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{m.body}</div>
                      <div className="chat-time">{timeLabel(m.createdAt)}</div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {chatUser && (
            <form className="chat-input-row" onSubmit={send}>
              <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message..." />
              <button type="submit" className="btn btn-primary">Send →</button>
            </form>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', maxHeight: '80vh', padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)' }}>📨 New Message</h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ width: 32, height: 32, border: 'none', background: 'var(--cream)', borderRadius: 8, cursor: 'pointer', fontSize: '1.25rem', color: 'var(--muted)' }}>×</button>
            </div>
            <div style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border)' }}>
              <input
                type="text"
                placeholder="🔍 Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid var(--border)', borderRadius: 10, fontFamily: 'inherit', fontSize: '0.9375rem' }}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {filteredContacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👥</div>
                  <h4 style={{ color: 'var(--navy)', marginBottom: '0.5rem' }}>No contacts found</h4>
                  <p style={{ fontSize: '0.875rem' }}>You don't have anyone to message yet.</p>
                </div>
              ) : (
                filteredContacts.map((c) => (
                  <div
                    key={c.id}
                    className="contact-item"
                    onClick={() => startConversation(c.id)}
                  >
                    <div className="contact-avatar" style={{ background: roleColor(c.role) }}>{initials(c.fullName)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '0.9375rem' }}>
                        {c.fullName}
                        {c.placementCount > 1 && <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 400 }}> ({c.placementCount} placements)</span>}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.125rem' }}>{c.email}</div>
                      {c.roleTitles && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>📍 {c.roleTitles}</div>}
                      {c.companies && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.125rem' }}>🏢 {c.companies}</div>}
                    </div>
                    <span className="role-pill" style={{ background: `${roleColor(c.role)}20`, color: roleColor(c.role) }}>{c.role?.[0]}{c.role?.slice(1).toLowerCase()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
