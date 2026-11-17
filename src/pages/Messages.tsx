import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  User, 
  Info,
  ChevronLeft,
  Loader2,
  Check,
  CheckCheck,
  Clock,
  Plus,
  X,
  Calendar,
  Stethoscope
} from 'lucide-react';
import { useAuth, getRegisteredPatients } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  senderEmail: string;
  senderName: string;
  text: string;
  timestamp: any;
  readBy?: Record<string, any>;
}

interface Conversation {
  id: string;
  participants: string[];
  participantsData: Record<string, { name: string; role: string; photoURL?: string }>;
  lastMessage?: string;
  lastMessageTimestamp?: any;
  typing?: Record<string, any>;
  createdAt: any;
}

export default function Messages() {
  const { profile, user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetEmail = searchParams.get('with');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserStatus, setOtherUserStatus] = useState<{ isOnline: boolean; lastSeen: any; typingTo: string | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout| null>(null);

  // Fetch conversations
  useEffect(() => {
    if (!profile?.email) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', profile.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          participants: d.participants || [],
          participantsData: d.participantsData || {},
          lastMessage: d.lastMessage,
          lastMessageTimestamp: d.lastMessageTimestamp,
          typing: d.typing || {},
          createdAt: d.createdAt
        });
      });
      list.sort((a, b) => {
        const timeA = a.lastMessageTimestamp?.toDate ? a.lastMessageTimestamp.toDate().getTime() : 0;
        const timeB = b.lastMessageTimestamp?.toDate ? b.lastMessageTimestamp.toDate().getTime() : 0;
        return timeB - timeA;
      });
      setConversations(list);
      setLoading(false);
    }, (err) => {
      console.warn('Error fetching conversations:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.email]);

  // Handle direct target email
  useEffect(() => {
    if (!targetEmail || !profile?.email || loading) return;

    const existingChat = conversations.find(c => 
      c.participants.includes(targetEmail) && c.participants.includes(profile.email)
    );

    if (existingChat) {
      setSelectedChat(existingChat);
    } else {
      const initChat = async () => {
        try {
          const registered = getRegisteredPatients();
          const targetPatient = registered.find(p => p.email.toLowerCase() === targetEmail.toLowerCase());
          const targetName = targetPatient?.name || (targetEmail.includes('doctor') ? 'Dr. Raihan' : 'Patient');
          const targetRole = targetEmail.includes('doctor') ? 'Doctor' : 'Patient';

          const newConvRef = await addDoc(collection(db, 'conversations'), {
            participants: [profile.email, targetEmail],
            participantsData: {
              [profile.email.replace(/\./g, '_')]: {
                name: profile.name || (profile.role === 'Doctor' ? 'Dr. Raihan' : 'Patient'),
                role: profile.role || 'Patient'
              },
              [targetEmail.replace(/\./g, '_')]: {
                name: targetName,
                role: targetRole
              }
            },
            createdAt: new Date(),
            lastMessage: 'Conversation opened',
            lastMessageTimestamp: new Date()
          });

          setSelectedChat({
            id: newConvRef.id,
            participants: [profile.email, targetEmail],
            participantsData: {
              [profile.email.replace(/\./g, '_')]: {
                name: profile.name || 'User',
                role: profile.role || 'Patient'
              },
              [targetEmail.replace(/\./g, '_')]: {
                name: targetName,
                role: targetRole
              }
            },
            createdAt: new Date()
          });
        } catch (e) {
          console.error("Error creating conversation with target:", e);
        }
      };
      initChat();
    }
  }, [targetEmail, conversations, profile?.email, loading]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChat) return;

    const q = query(
      collection(db, 'conversations', selectedChat.id, 'messages')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Message[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          senderEmail: d.senderEmail,
          senderName: d.senderName,
          text: d.text,
          timestamp: d.timestamp,
          readBy: d.readBy || {}
        });
      });
      list.sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return timeA - timeB;
      });
      setMessages(list);
    });

    return () => unsubscribe();
  }, [selectedChat]);

  // Auto-scroll messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!messages.length || !profile?.email || !selectedChat) return;

    const unreadMessages = messages.filter(
      m => m.senderEmail !== profile.email && (!m.readBy || !m.readBy[profile.email.replace(/\./g, '_')])
    );

    if (unreadMessages.length > 0) {
      const markAsRead = async () => {
        for (const msg of unreadMessages) {
          try {
            await updateDoc(doc(db, 'conversations', selectedChat.id, 'messages', msg.id), {
              [`readBy.${profile.email.replace(/\./g, '_')}`]: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error marking message read:', error);
          }
        }
      };
      markAsRead();
    }
  }, [messages, profile?.email, selectedChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !profile?.email || sending) return;

    const textPayload = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await addDoc(collection(db, 'conversations', selectedChat.id, 'messages'), {
        text: textPayload,
        senderEmail: profile.email,
        senderName: profile.name || (profile.role === 'Doctor' ? 'Dr. Raihan' : 'Patient'),
        timestamp: new Date(),
        readBy: { [profile.email.replace(/\./g, '_')]: new Date().toISOString() }
      });

      await updateDoc(doc(db, 'conversations', selectedChat.id), {
        lastMessage: textPayload,
        lastMessageTimestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleSearchUsers = () => {
    setSearchingUsers(true);
    const registered = getRegisteredPatients();
    const queryLower = userSearchQuery.toLowerCase().trim();
    
    // Add default doctor if looking for care provider
    const list: any[] = [
      { name: 'Dr. Raihan', email: 'doctor@clinic.com', role: 'Doctor' },
      ...registered.map(p => ({ name: p.name, email: p.email, role: 'Patient' }))
    ];

    const filtered = list.filter(u => 
      u.email.toLowerCase() !== (profile?.email || '').toLowerCase() &&
      (u.name.toLowerCase().includes(queryLower) || u.email.toLowerCase().includes(queryLower))
    );

    setSearchResults(filtered);
    setSearchingUsers(false);
  };

  useEffect(() => {
    if (showNewChatModal) {
      handleSearchUsers();
    }
  }, [userSearchQuery, showNewChatModal]);

  const handleStartNewChat = async (targetUser: any) => {
    if (!profile?.email) return;

    const existingChat = conversations.find(c => 
      c.participants.includes(targetUser.email) && c.participants.includes(profile.email)
    );

    if (existingChat) {
      setSelectedChat(existingChat);
      setShowNewChatModal(false);
      return;
    }

    try {
      const newConvRef = await addDoc(collection(db, 'conversations'), {
        participants: [profile.email, targetUser.email],
        participantsData: {
          [profile.email.replace(/\./g, '_')]: {
            name: profile.name || (profile.role === 'Doctor' ? 'Dr. Raihan' : 'Patient'),
            role: profile.role || 'Patient'
          },
          [targetUser.email.replace(/\./g, '_')]: {
            name: targetUser.name || 'User',
            role: targetUser.role || 'Patient'
          }
        },
        createdAt: new Date(),
        lastMessage: 'Conversation opened',
        lastMessageTimestamp: new Date()
      });

      setSelectedChat({
        id: newConvRef.id,
        participants: [profile.email, targetUser.email],
        participantsData: {
          [profile.email.replace(/\./g, '_')]: {
            name: profile.name || 'User',
            role: profile.role || 'Patient'
          },
          [targetUser.email.replace(/\./g, '_')]: {
            name: targetUser.name || 'User',
            role: targetUser.role || 'Patient'
          }
        },
        createdAt: new Date()
      });
      setShowNewChatModal(false);
    } catch (e) {
      console.error('Error starting conversation:', e);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-140px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const otherParticipant = selectedChat 
    ? selectedChat.participants.find(e => e.toLowerCase() !== profile?.email.toLowerCase())
    : null;
  const otherData = (selectedChat && otherParticipant) 
    ? (selectedChat.participantsData[otherParticipant.replace(/\./g, '_')] || { name: otherParticipant, role: 'Patient' })
    : null;

  return (
    <div className="h-[calc(100vh-140px)] flex gap-4 overflow-hidden">
      
      {/* Conversations List Sidebar */}
      <div className={cn(
        "w-full md:w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden transition-all",
        selectedChat && "hidden md:flex"
      )}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Messages</h2>
            <button 
              onClick={() => setShowNewChatModal(true)}
              className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
              title="New Message"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.filter(c => {
            const other = c.participants.find(e => e !== profile?.email);
            const name = c.participantsData[other?.replace(/\./g, '_') || '']?.name || other || '';
            return name.toLowerCase().includes(searchQuery.toLowerCase());
          }).length > 0 ? (
            conversations
              .filter(c => {
                const other = c.participants.find(e => e !== profile?.email);
                const name = c.participantsData[other?.replace(/\./g, '_') || '']?.name || other || '';
                return name.toLowerCase().includes(searchQuery.toLowerCase());
              })
              .map((conv) => {
                const other = conv.participants.find(e => e !== profile?.email);
                const data = conv.participantsData[other?.replace(/\./g, '_') || ''] || { name: other, role: 'Patient' };
                const isSelected = selectedChat?.id === conv.id;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedChat(conv)}
                    className={cn(
                      "w-full p-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-100 dark:border-slate-800/60 cursor-pointer text-left",
                      isSelected && "bg-emerald-50/60 dark:bg-emerald-950/30 border-l-4 border-l-emerald-600"
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {(data.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate text-xs">
                          {data.name || other}
                        </h4>
                        {conv.lastMessageTimestamp && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(conv.lastMessageTimestamp?.toDate ? conv.lastMessageTimestamp.toDate() : conv.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {conv.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </button>
                );
              })
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-slate-800 dark:text-slate-200 font-semibold text-xs">No conversations</p>
                <p className="text-[11px] text-slate-400 max-w-xs">Start a secure conversation with your dentist or registered patient.</p>
              </div>
              <button 
                onClick={() => setShowNewChatModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                Start New Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Box */}
      <div className={cn(
        "flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden transition-all",
        !selectedChat && "hidden md:flex"
      )}>
        {selectedChat && otherData ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {(otherData.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {otherData.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {otherParticipant} • {otherData.role || 'Patient'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => navigate('/appointments')}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  title="Appointments"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Appointments</span>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex justify-center mb-2">
                <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300">
                    Direct clinic message thread. For immediate dental emergencies, please call the clinic desk directly.
                  </p>
                </div>
              </div>

              {messages.map((msg) => {
                const isMe = msg.senderEmail.toLowerCase() === profile?.email.toLowerCase();
                
                return (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "flex flex-col",
                      isMe ? "items-end" : "items-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[80%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed transition-all shadow-xs",
                      isMe 
                        ? "bg-emerald-600 text-white rounded-tr-xs" 
                        : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-xs"
                    )}>
                      {msg.text}
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 mt-1 px-1",
                      isMe ? "flex-row-reverse" : "flex-row"
                    )}>
                      <span className="text-[9px] text-slate-400">
                        {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sent'}
                      </span>
                      {isMe && <CheckCheck className="w-3 h-3 text-emerald-500" />}
                    </div>
                  </div>
                );
              })}
              
              <div ref={scrollRef} />
            </div>

            {/* Composer */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message to dentist or patient..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-900 dark:text-slate-100 transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 tracking-tight">Select a conversation</h3>
              <p className="text-xs text-slate-400 max-w-xs">Choose a patient or dentist thread from the left to start communication.</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Start Direct Message</h3>
                <button onClick={() => setShowNewChatModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                    autoFocus
                  />
                </div>

                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                  {searchingUsers ? (
                    <div className="py-6 text-center">
                      <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mx-auto" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((target) => (
                      <button
                        key={target.email}
                        onClick={() => handleStartNewChat(target)}
                        className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xs border border-emerald-200 dark:border-emerald-800">
                          {(target.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{target.name || 'User'}</p>
                          <p className="text-[10px] text-slate-400">{target.email} • {target.role}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="py-6 text-center text-xs text-slate-400">No members found.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
