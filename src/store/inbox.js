import { useState, useCallback, useEffect } from 'react';

const INBOX_KEY = 'salesedge:inbox';

const SEED_MESSAGES = [
  {
    id: 'msg-seed-1',
    platform: 'email',
    senderName: 'David Goldstein',
    senderEmail: 'dgoldstein@goldsteinreyes.com',
    leadId: 'seed-2',
    subject: 'Re: your LinkedIn post about legal tech',
    content: 'Thanks for reaching out. We are actually looking at our tech stack right now. Clio has been frustrating for our foreclosure workflow. Can you tell me more about how LegalEdge handles batch filings?',
    sentiment: 'positive',
    read: false,
    draft: null,
    repliedAt: null,
    receivedAt: '2026-03-18T22:15:00Z',
  },
  {
    id: 'msg-seed-2',
    platform: 'linkedin',
    senderName: 'Monica Rivera',
    senderEmail: 'mrivera@riveralawfl.com',
    leadId: 'seed-3',
    subject: 'LinkedIn message',
    content: 'I saw your post about eviction filing automation. Interesting concept. How does it handle the 3-day notice requirements for Miami-Dade specifically?',
    sentiment: 'inquiry',
    read: false,
    draft: null,
    repliedAt: null,
    receivedAt: '2026-03-19T08:30:00Z',
  },
  {
    id: 'msg-seed-3',
    platform: 'email',
    senderName: 'James Whitfield',
    senderEmail: 'jwhitfield@bocarelawgroup.com',
    leadId: 'seed-4',
    subject: 'Re: Quick demo — Boca RE firms',
    content: 'We are fairly happy with PracticePanther right now. Maybe revisit this in Q3 when our contract is up.',
    sentiment: 'neutral',
    read: true,
    draft: null,
    repliedAt: null,
    receivedAt: '2026-03-17T14:20:00Z',
  },
];

function loadInbox() {
  try {
    const stored = localStorage.getItem(INBOX_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load inbox:', e);
  }
  return SEED_MESSAGES;
}

function saveInbox(messages) {
  try {
    localStorage.setItem(INBOX_KEY, JSON.stringify(messages));
  } catch (e) {
    console.error('Failed to save inbox:', e);
  }
}

export function useInbox() {
  const [messages, setMessages] = useState(loadInbox);

  useEffect(() => {
    saveInbox(messages);
  }, [messages]);

  const addMessage = useCallback((msgData) => {
    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      platform: msgData.platform || 'email',
      senderName: msgData.senderName || 'Unknown',
      senderEmail: msgData.senderEmail || '',
      leadId: msgData.leadId || null,
      subject: msgData.subject || '',
      content: msgData.content || '',
      sentiment: msgData.sentiment || 'neutral',
      read: false,
      draft: null,
      repliedAt: null,
      receivedAt: new Date().toISOString(),
    };
    setMessages(prev => [newMsg, ...prev]);
    return newMsg;
  }, []);

  const updateMessage = useCallback((id, updates) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const markRead = useCallback((id) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  }, []);

  const getUnreadCount = useCallback(() => {
    return messages.filter(m => !m.read).length;
  }, [messages]);

  return { messages, addMessage, updateMessage, markRead, getUnreadCount };
}
