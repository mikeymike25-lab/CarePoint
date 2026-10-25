import React, { useState, useEffect, useCallback } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonIcon, useIonRouter, useIonViewWillEnter, IonRefresher, IonRefresherContent, IonFab, IonFabButton
} from '@ionic/react';
import { chatbubbles, chevronForward, medkit, searchOutline, bagHandle, addOutline, createOutline } from 'ionicons/icons';
import { getCustomerInquiries, getOrdersWithMessages, subscribeToCustomerChatList } from '../services/chatService';
import { useAuth } from '../../shared/context/AuthContext';
import type { Inquiry, Order } from '../../shared/types/database';
import { ChatListSkeleton } from '../../shared/components/SkeletonLoaders';

type ChatEntry =
  | { kind: 'inquiry'; data: Inquiry; sortKey: string }
  | { kind: 'order'; data: Order; sortKey: string };

const Inquiries: React.FC = () => {
  const { user, profile } = useAuth();
  const router = useIonRouter();
  const [chats, setChats] = useState<ChatEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const customerId = user?.id || profile?.id;

  const fetchChats = useCallback(async () => {
    if (!customerId) return;
    try {
      const [inquiries, orders] = await Promise.all([
        getCustomerInquiries(customerId),
        getOrdersWithMessages(customerId),
      ]);

      const entries: ChatEntry[] = [
        ...inquiries.map((i): ChatEntry => ({ kind: 'inquiry', data: i, sortKey: i.updated_at || i.created_at })),
        ...orders.map((o): ChatEntry => ({ kind: 'order', data: o, sortKey: o.updated_at || o.created_at })),
      ];

      // Most-recently-active first
      entries.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
      setChats(entries);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  }, [customerId]);

  useEffect(() => {
    if (!customerId) return;
    let isMounted = true;
    async function init() {
      setLoading(true);
      await fetchChats();
      if (isMounted) setLoading(false);
    }
    init();

    const unsubscribe = subscribeToCustomerChatList(customerId, () => {
      fetchChats();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [customerId, fetchChats]);

  useIonViewWillEnter(() => {
    fetchChats();
  });

  const handleRefresh = async (e: CustomEvent) => {
    await fetchChats();
    e.detail.complete();
  };

  const handleNewInquiry = () => {
    router.push('/customer/search');
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border bg-white shadow-xs border-b border-slate-100">
        <IonToolbar className="px-2 py-1" style={{ '--background': '#ffffff' } as React.CSSProperties}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/customer/profile" text="" />
          </IonButtons>
          <IonTitle className="font-bold text-slate-900">Inquiries</IonTitle>
          {/* Always-visible header button to start a new inquiry */}
          <IonButtons slot="end">
            <button
              onClick={handleNewInquiry}
              className="mr-2 flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all shadow-sm"
            >
              <IonIcon icon={createOutline} className="text-base" />
              <span>New Inquiry</span>
            </button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="bg-slate-50">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="px-4 py-6 max-w-3xl mx-auto w-full space-y-4 pb-24">
          <h2 className="text-xl font-bold text-slate-800 mb-4 px-1 flex items-center gap-2">
            <IonIcon icon={chatbubbles} className="text-teal-600" />
            Your Chats
          </h2>

          {loading ? (
            <ChatListSkeleton count={3} />
          ) : chats.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                <IonIcon icon={chatbubbles} className="text-3xl" />
              </div>
              <p className="text-slate-800 font-bold text-base">No chats yet</p>
              <p className="text-slate-500 text-sm mt-1 max-w-sm">
                Have questions about prescription drugs or store availability? Ask our verified partner pharmacies directly.
              </p>
              <button
                onClick={handleNewInquiry}
                style={{ padding: '12px 24px', borderRadius: '14px' }}
                className="mt-5 inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-md shadow-teal-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <IonIcon icon={searchOutline} className="text-base" />
                <span>Browse Medicines to Inquire</span>
              </button>
            </div>
          ) : (
            <>
              {/* Quick-start hint banner */}
              <div className="flex items-center justify-between px-1 mb-1">
                <p className="text-xs text-slate-400 font-medium">{chats.length} active {chats.length === 1 ? 'thread' : 'threads'}</p>
                <button
                  onClick={handleNewInquiry}
                  className="flex items-center gap-1 text-teal-600 text-xs font-semibold hover:text-teal-700 transition-colors"
                >
                  <IonIcon icon={addOutline} className="text-sm" />
                  New Inquiry
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 divide-y divide-slate-100 overflow-hidden">
                {chats.map((entry) => {
                  if (entry.kind === 'inquiry') {
                    const inquiry = entry.data as Inquiry;
                    const isResolved = inquiry.status === 'closed';
                    return (
                      <div
                        key={`inquiry-${inquiry.inquiry_id}`}
                        onClick={() => router.push(`/customer/messages/inquiry/${inquiry.inquiry_id}`)}
                        className="p-4 flex items-center gap-4 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100/50">
                          <IonIcon icon={medkit} className="text-xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <h3 className="font-bold text-slate-900 truncate text-[15px]">
                              {inquiry.pharmacy?.name}
                            </h3>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  isResolved
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {isResolved ? 'Resolved' : 'Open'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                {new Date(inquiry.updated_at || inquiry.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs font-semibold text-teal-700 truncate mb-0.5">
                            {inquiry.subject}
                          </p>
                          <p className="text-sm text-slate-500 truncate">
                            {inquiry.item?.brand_name
                              ? `${inquiry.item.brand_name} (${inquiry.item.generic_name})`
                              : inquiry.item?.generic_name}
                          </p>
                        </div>
                        <IonIcon icon={chevronForward} className="text-slate-300 shrink-0" />
                      </div>
                    );
                  } else {
                    const order = entry.data as Order;
                    return (
                      <div
                        key={`order-${order.order_id}`}
                        onClick={() => router.push(`/customer/messages/order/${order.order_id}`)}
                        className="p-4 flex items-center gap-4 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100/50">
                          <IonIcon icon={bagHandle} className="text-xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-slate-900 truncate text-[15px]">
                              {order.pharmacy?.name}
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap ml-2">
                              {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-sky-700 truncate mb-0.5">
                            Order #{order.order_id}
                          </p>
                          <p className="text-sm text-slate-500 truncate capitalize">
                            {order.method} · {order.status}
                          </p>
                        </div>
                        <IonIcon icon={chevronForward} className="text-slate-300 shrink-0" />
                      </div>
                    );
                  }
                })}
              </div>
            </>
          )}
        </div>

        {/* Floating Action Button — always-visible shortcut to start a new inquiry */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton
            onClick={handleNewInquiry}
            style={{ '--background': '#0D9488', '--background-activated': '#0F766E' } as React.CSSProperties}
          >
            <IonIcon icon={createOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default Inquiries;
