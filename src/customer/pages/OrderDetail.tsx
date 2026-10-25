import React, { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonText, IonIcon, useIonRouter
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { getOrderDetails, subscribeToOrder } from '../services/orderService';
import type { Order } from '../../shared/types/database';
import { 
  checkmarkCircle, time, bagCheck, 
  closeCircle, documentText, storefront, chatbubbles,
  bicycleOutline, pinOutline
} from 'ionicons/icons';
import { OrderDetailSkeleton } from '../../shared/components/SkeletonLoaders';
import AddressMapPicker from '../components/AddressMapPicker';

const statusProgress: Record<string, { label: string; icon: string; step: number; color: string }> = {
  pending: { label: 'Pending', icon: time, step: 0, color: 'text-amber-500' },
  confirmed: { label: 'Confirmed', icon: documentText, step: 1, color: 'text-blue-500' },
  ready: { label: 'Ready', icon: bagCheck, step: 2, color: 'text-purple-500' },
  completed: { label: 'Completed', icon: checkmarkCircle, step: 3, color: 'text-emerald-500' },
  cancelled: { label: 'Cancelled', icon: closeCircle, step: -1, color: 'text-red-500' }
};

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useIonRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      if (!id) return;
      setLoading(true);
      const { data, error } = await getOrderDetails(parseInt(id, 10));
      if (!error && data) {
        setOrder(data);
      }
      setLoading(false);
    }
    loadOrder();
  }, [id]);

  useEffect(() => {
    if (!order?.order_id) return;
    
    // Subscribe to real-time status & pharmacy storefront updates
    const channel = subscribeToOrder(order.order_id, async (payload) => {
      if (payload.new && payload.new.status) {
        setOrder((prev) => prev ? { ...prev, status: payload.new.status } : null);
      }
      const { data } = await getOrderDetails(order.order_id);
      if (data) setOrder(data);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [order?.order_id]);

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border bg-white shadow-xs border-b border-slate-100">
          <IonToolbar className="px-2 py-1" style={{ '--background': '#ffffff' } as React.CSSProperties}>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/customer/orders" text="" />
            </IonButtons>
            <IonTitle className="font-bold text-slate-900">Order Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="bg-slate-50">
          <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto w-full">
            <OrderDetailSkeleton />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!order) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border bg-white shadow-xs border-b border-slate-100">
          <IonToolbar className="px-2 py-1" style={{ '--background': '#ffffff' } as React.CSSProperties}>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/customer/orders" text="" />
            </IonButtons>
            <IonTitle className="font-bold text-slate-900">Order Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="bg-slate-50">
          <div className="text-center p-8">
            <IonText color="medium">Order not found.</IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const currentStatus = statusProgress[order.status] || statusProgress.pending;
  const isCancelled = order.status === 'cancelled';
  const steps = [
    statusProgress.pending,
    statusProgress.confirmed,
    statusProgress.ready,
    statusProgress.completed
  ];

  return (
    <IonPage>
      <IonHeader className="ion-no-border bg-white shadow-xs border-b border-slate-100">
        <IonToolbar className="px-2 py-1" style={{ '--background': '#ffffff' } as React.CSSProperties}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/customer/orders" text="" />
          </IonButtons>
          <IonTitle className="font-bold text-slate-900 text-lg">Order #{order.order_id}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-slate-50">
        <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto w-full space-y-5 pb-12">
          
          {/* Progress Bar / Status Banner */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-8 text-center">
              {isCancelled ? (
                <span className="text-rose-600 flex items-center justify-center gap-2">
                  <IonIcon icon={closeCircle} className="text-2xl" /> Order Cancelled
                </span>
              ) : (
                <span className={`${currentStatus.color.replace('500', '600')} flex items-center justify-center gap-2`}>
                  <IonIcon icon={currentStatus.icon} className="text-2xl" /> Order {currentStatus.label}
                </span>
              )}
            </h2>

            {!isCancelled && (
              <div className="relative px-2">
                {/* Track Line Container */}
                <div className="absolute top-4 left-6 right-6 h-1.5 bg-slate-100 -translate-y-1/2 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-teal-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${(Math.max(0, currentStatus.step) / 3) * 100}%` }}
                  />
                </div>

                {/* Step Nodes */}
                <div className="relative flex justify-between z-10">
                  {steps.map((step) => {
                    const isActive = currentStatus.step >= step.step;
                    return (
                      <div key={step.label} className="flex flex-col items-center">
                        <div 
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white transition-colors duration-500 shadow-sm
                            ${isActive ? 'border-teal-500' : 'border-slate-200'}
                          `}
                        >
                          <div className={`w-3 h-3 rounded-full transition-all duration-500 ${isActive ? 'bg-teal-500 scale-100' : 'bg-transparent scale-0'}`} />
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider font-bold mt-2 text-center w-16
                          ${isActive ? 'text-teal-700' : 'text-slate-400'}
                        `}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Pharmacy Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100/50 shadow-xs">
                <IonIcon icon={storefront} className="text-2xl" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-0.5">Partner Pharmacy</p>
                <h3 className="font-bold text-slate-900 text-base">{order.pharmacy?.name}</h3>
                <p className="text-sm text-slate-500 font-medium truncate mt-0.5">{order.pharmacy?.address}</p>
                {((order.pharmacy as any)?.operating_hours || (order.pharmacy as any)?.phone_number) && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(order.pharmacy as any)?.operating_hours}
                    {(order.pharmacy as any)?.phone_number ? ` • ${(order.pharmacy as any)?.phone_number}` : ''}
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ordered On</p>
                <p className="text-sm font-bold text-slate-800">
                  {new Date(order.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Method</p>
                <p className="text-sm font-black text-teal-700 uppercase tracking-wide bg-teal-50 inline-block px-2 py-0.5 rounded-md">
                  {order.method}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
               <button 
                 onClick={() => router.push(`/customer/messages/order/${order.order_id}`)}
                 className="w-full bg-slate-50 hover:bg-slate-100 text-teal-700 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-200"
               >
                 <IonIcon icon={chatbubbles} className="text-lg" />
                 Message Pharmacy
               </button>
            </div>
          </div>

          {/* Delivery Destination (Home Delivery) */}
          {order.method === 'delivery' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 space-y-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100/50 shadow-xs">
                  <IonIcon icon={bicycleOutline} className="text-2xl" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-sky-700 uppercase tracking-wider mb-0.5">Delivery Destination</p>
                  <h3 className="font-bold text-slate-900 text-base">
                    {order.recipient_name || 'Home Delivery'}
                  </h3>
                  {order.recipient_phone && (
                    <p className="text-xs text-slate-500 font-medium">{order.recipient_phone}</p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                  {order.delivery_address || 'Registered Profile Address'}
                </p>
                {order.delivery_notes && (
                  <p className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <strong className="text-slate-600">Drop-off Note:</strong> {order.delivery_notes}
                  </p>
                )}
              </div>

              {order.delivery_lat && order.delivery_lng ? (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-teal-700 flex items-center gap-1">
                      <IonIcon icon={pinOutline} className="text-teal-600" />
                      Pinned Delivery Location
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {order.delivery_lat.toFixed(4)}, {order.delivery_lng.toFixed(4)}
                    </span>
                  </div>
                  <AddressMapPicker
                    latitude={order.delivery_lat}
                    longitude={order.delivery_lng}
                    height="180px"
                    readOnly={true}
                  />
                </div>
              ) : null}
            </div>
          )}

          {/* Itemized Receipt */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
              <IonIcon icon={documentText} className="text-teal-600 text-lg" />
              <h3 className="font-bold text-slate-900 text-base">Order Summary</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {order.items?.map((item) => (
                <div key={item.order_item_id} className="p-5 flex justify-between items-start gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-800 text-sm leading-snug mb-1">
                      {item.item?.brand_name ? `${item.item.brand_name} (${item.item.generic_name})` : item.item?.generic_name}
                    </h4>
                    <p className="text-xs font-semibold text-slate-500">
                      {item.quantity} × ₱{item.unit_price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 font-bold text-slate-800 text-sm">
                    ₱{(item.quantity * item.unit_price).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-gradient-to-b from-slate-50 to-slate-100/50 p-5 space-y-3.5 border-t border-slate-200/60">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-600">Subtotal</span>
                <span className="font-bold text-slate-800">
                  ₱{(order.total_amount - (order.method === 'delivery' ? 50 : 0)).toFixed(2)}
                </span>
              </div>
              {order.method === 'delivery' && (
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-600">Delivery Fee</span>
                  <span className="font-bold text-slate-800">₱50.00</span>
                </div>
              )}
              <div className="border-t border-dashed border-slate-300 pt-3 flex justify-between items-baseline mt-1">
                <span className="font-bold text-slate-900 text-base">Total Amount</span>
                <span className="font-black text-teal-700 text-2xl tracking-tight">
                  ₱{order.total_amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default OrderDetail;
