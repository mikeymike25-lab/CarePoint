import React, { useEffect, useState, useRef } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonFooter, IonInput, IonIcon, IonSpinner
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { send, informationCircle } from 'ionicons/icons';
import { getOrderMessages, subscribeToOrderMessages, sendOrderMessage, getInquiryDetails, getInquiryMessages, subscribeToInquiryMessages, sendInquiryMessage, cleanupSubscription } from '../services/chatService';
import { getOrderDetails } from '../services/orderService';
import { useAuth } from '../../shared/context/AuthContext';
import type { Message } from '../../shared/types/database';
import { ChatMessageSkeleton } from '../../shared/components/SkeletonLoaders';
import { cleanEmailToName } from '../../shared/utils/userProfile';

const Chat: React.FC = () => {
  const { type, id = '' } = useParams<{ type: 'order' | 'inquiry'; id: string }>();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [targetName, setTargetName] = useState('');
  const [targetContext, setTargetContext] = useState('');
  const [threadStatus, setThreadStatus] = useState<string>('');
  const contentRef = useRef<HTMLIonContentElement>(null);
  
  const numericId = parseInt(id, 10);

  useEffect(() => {
    async function loadData() {
      if (!id || !profile) return;
      setLoading(true);

      try {
        if (type === 'order') {
          const [orderRes, msgs] = await Promise.all([
            getOrderDetails(numericId),
            getOrderMessages(numericId)
          ]);
          if (orderRes.data) {
            setTargetName(orderRes.data.pharmacy?.name || 'Pharmacy');
            setTargetContext(`Order #${orderRes.data.order_id}`);
            setThreadStatus(orderRes.data.status || 'pending');
          }
          setMessages(msgs);
        } else if (type === 'inquiry') {
          const [inquiry, msgs] = await Promise.all([
            getInquiryDetails(numericId),
            getInquiryMessages(numericId)
          ]);
          setTargetName(inquiry.pharmacy?.name || 'Pharmacy');
          setTargetContext(inquiry.item?.brand_name ? `${inquiry.item.brand_name} (${inquiry.item.generic_name})` : inquiry.item?.generic_name || 'Prescription Inquiry');
          setThreadStatus(inquiry.status || 'open');
          setMessages(msgs);
        }
      } catch (error) {
        console.error('Error loading chat:', error);
      } finally {
        setLoading(false);
        setTimeout(() => contentRef.current?.scrollToBottom(300), 100);
      }
    }
    loadData();
  }, [id, type, numericId, profile]);

  useEffect(() => {
    if (!id || !profile) return;

    let channel: any;
    if (type === 'order') {
      channel = subscribeToOrderMessages(
        numericId,
        (msg) => {
          setMessages(prev => {
            if (prev.find(m => m.message_id === msg.message_id)) return prev;
            return [...prev, msg];
          });
          setTimeout(() => contentRef.current?.scrollToBottom(300), 100);
        },
        (newStatus) => {
          setThreadStatus(newStatus);
        }
      );
    } else if (type === 'inquiry') {
      channel = subscribeToInquiryMessages(
        numericId,
        (msg) => {
          setMessages(prev => {
            if (prev.find(m => m.message_id === msg.message_id)) return prev;
            return [...prev, msg];
          });
          setTimeout(() => contentRef.current?.scrollToBottom(300), 100);
        },
        (newStatus) => {
          setThreadStatus(newStatus);
        }
      );
    }

    return () => {
      if (channel) cleanupSubscription(channel);
    };
  }, [id, type, numericId, profile]);

  const handleSend = async () => {
    if (!inputMessage.trim() || !profile) return;
    
    setSending(true);
    const text = inputMessage.trim();
    setInputMessage(''); // optimistic clear
    
    try {
      if (type === 'order') {
        await sendOrderMessage(numericId, text, profile.id);
      } else if (type === 'inquiry') {
        await sendInquiryMessage(numericId, text, profile.id);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // fallback to restore message if failed
      setInputMessage(text);
    } finally {
      setSending(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setInputMessage(text);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border bg-white shadow-xs border-b border-slate-100">
        <IonToolbar className="px-2 py-1" style={{ '--background': '#ffffff' } as React.CSSProperties}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/customer/inquiries" text="" />
          </IonButtons>
          <div className="flex items-center justify-between pr-3">
            <div className="flex flex-col min-w-0">
              <IonTitle className="font-bold text-slate-900 text-base px-0">{targetName}</IonTitle>
              <span className="text-xs text-slate-500 font-medium px-4 truncate">{targetContext}</span>
            </div>
            {threadStatus && (
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shrink-0 ${
                  threadStatus === 'closed' || threadStatus === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : threadStatus === 'cancelled'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {type === 'inquiry'
                  ? threadStatus === 'closed'
                    ? 'Resolved'
                    : 'Open'
                  : threadStatus}
              </span>
            )}
          </div>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="bg-slate-50" ref={contentRef}>
        {type === 'inquiry' && (
          <div className="bg-amber-50 border-b border-amber-200/60 p-4 mb-2">
            <div className="flex gap-3">
              <IonIcon icon={informationCircle} className="text-amber-600 text-xl shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-800 mb-1">Prescription Safety Rules</h4>
                <p className="text-xs font-medium text-amber-700/90 leading-relaxed">
                  Under Philippine FDA regulations, prescription items cannot be purchased or delivered online. This chat is for checking in-store stock availability only. A valid physical doctor's prescription is required upon in-store pickup.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 space-y-4 pb-6">
          {loading ? (
            <ChatMessageSkeleton count={4} />
          ) : messages.length === 0 ? (
            <div className="text-center p-8 text-slate-400 font-medium">
              No messages yet. Send a message to start the conversation!
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === profile?.id;
              return (
                <div key={msg.message_id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {!isMine && (
                    <span className="text-[10px] font-bold text-slate-400 mb-1 ml-1">
                      {msg.sender?.role === 'staff' 
                        ? 'Staff' 
                        : (msg.sender?.full_name?.includes('@') 
                            ? cleanEmailToName(msg.sender.full_name) 
                            : (msg.sender?.full_name || 'Customer'))}
                    </span>
                  )}
                  <div 
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm text-[15px] leading-relaxed
                      ${isMine 
                        ? 'bg-teal-600 text-white rounded-tr-sm' 
                        : 'bg-white border border-slate-200/60 text-slate-800 rounded-tl-sm'
                      }`}
                  >
                    {msg.content}
                  </div>
                  <span className={`text-[10px] font-medium text-slate-400 mt-1 ${isMine ? 'mr-1' : 'ml-1'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </IonContent>

      <IonFooter className="bg-white border-t border-slate-200/60">
        <div className="px-3 py-2 flex gap-2 overflow-x-auto no-scrollbar">
          {type === 'order' ? (
            <>
              <button onClick={() => handleQuickReply('Is my order ready for pickup?')} className="shrink-0 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 text-xs font-bold px-4 py-2 rounded-full">Order ready?</button>
              <button onClick={() => handleQuickReply('Can I change my delivery address?')} className="shrink-0 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 text-xs font-bold px-4 py-2 rounded-full">Change address</button>
            </>
          ) : (
            <>
              <button onClick={() => handleQuickReply('Do you have this in stock?')} className="shrink-0 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 text-xs font-bold px-4 py-2 rounded-full">In stock?</button>
              <button onClick={() => handleQuickReply('What are your store hours?')} className="shrink-0 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 text-xs font-bold px-4 py-2 rounded-full">Store hours</button>
            </>
          )}
        </div>
        <IonToolbar className="px-2 pb-2" style={{ '--background': '#ffffff' } as React.CSSProperties}>
          <div className="flex items-center gap-2 bg-slate-100 rounded-full pl-4 pr-2 py-1 border border-transparent focus-within:border-teal-500/30 focus-within:bg-white transition-colors shadow-sm">
            <IonInput 
              value={inputMessage}
              onIonInput={e => setInputMessage(e.detail.value!)}
              placeholder="Type your message..."
              className="text-[15px]"
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            />
            <button 
              onClick={handleSend}
              disabled={sending || !inputMessage.trim()}
              className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 disabled:opacity-50 disabled:bg-slate-300 transition-colors shadow-sm"
            >
              {sending ? <IonSpinner name="dots" color="light" /> : <IonIcon icon={send} className="text-lg -ml-0.5" />}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Chat;
