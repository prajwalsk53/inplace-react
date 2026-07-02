import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';

export default function Messages() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const bottomRef = useRef(null);

  const loadThreads = () => api.get('/messages/threads').then(({ data }) => setThreads(data));

  useEffect(() => {
    loadThreads();
    api.get('/messages/contacts').then(({ data }) => setContacts(data));

    const socket = getSocket();
    socket.emit('join', user.id);
    const onNewMessage = (msg) => {
      setActivePartner((current) => {
        if (current && (msg.senderId === current.id || msg.receiverId === current.id)) {
          setMessages((prev) => [...prev, msg]);
        }
        return current;
      });
      loadThreads();
    };
    socket.on('new-message', onNewMessage);
    return () => socket.off('new-message', onNewMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openThread = async (partner) => {
    setActivePartner(partner);
    const { data } = await api.get(`/messages/thread/${partner.id}`);
    setMessages(data);
    loadThreads();
  };

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim() || !activePartner) return;
    const { data } = await api.post('/messages', { receiverId: activePartner.id, body });
    setMessages((prev) => [...prev, data]);
    getSocket().emit('send-message', { ...data, receiverId: activePartner.id });
    setBody('');
    loadThreads();
  };

  const allPeople = new Map();
  threads.forEach((t) => allPeople.set(t.partner.id, t.partner));
  contacts.forEach((c) => { if (!allPeople.has(c.id)) allPeople.set(c.id, c); });

  return (
    <div className="chat-thread">
      <div className="chat-list">
        {Array.from(allPeople.values()).map((person) => {
          const thread = threads.find((t) => t.partner.id === person.id);
          return (
            <div
              key={person.id}
              className={`chat-list-item${activePartner?.id === person.id ? ' active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => openThread(person)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{person.fullName}</strong>
                {thread?.unreadCount > 0 && <span className="badge badge-info">{thread.unreadCount}</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{person.role?.toLowerCase()}</div>
              {thread && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{thread.lastMessage.body.slice(0, 40)}</div>}
            </div>
          );
        })}
        {allPeople.size === 0 && <div className="empty-state">No contacts yet</div>}
      </div>

      <div className="chat-panel">
        {activePartner ? (
          <>
            <div style={{ padding: '14px 20px', background: 'var(--white)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
              {activePartner.fullName}
            </div>
            <div className="chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`chat-bubble ${m.senderId === user.id ? 'mine' : 'theirs'}`}>
                  {m.body}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form className="chat-input-row" onSubmit={send}>
              <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message..." />
              <button type="submit" className="btn btn-primary">Send</button>
            </form>
          </>
        ) : (
          <div className="empty-state">Select a conversation to start messaging</div>
        )}
      </div>
    </div>
  );
}
