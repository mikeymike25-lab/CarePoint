import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  useIonRouter, useIonViewWillEnter, IonBadge, IonMenuButton, IonRefresher, IonRefresherContent
} from '@ionic/react';
import { cartOutline, storefrontOutline, bagHandleOutline, refreshOutline } from 'ionicons/icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../../shared/context/AuthContext';
import { getOrders, subscribeToCustomerOrders } from '../services/orderService';
import type { Order } from '../../shared/types/database';
import { OrderCardSkeleton } from '../../shared/components/SkeletonLoaders';
import { resolveMedicineImageUrl } from '../../shared/data/medicines';

const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending': return 'bg-amber-100 text-amber-800';
    case 'confirmed': return 'bg-blue-100 text-blue-800';
    case 'ready': return 'bg-indigo-100 text-indigo-800';
    case 'completed': return 'bg-emerald-100 text-emerald-800';
    case 'cancelled': return 'bg-rose-100 text-rose-800';
    default: return 'bg-slate-100 text-slate-800';
  }
};

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

const Orders: React.FC = () => {
  const { user } = useAuth();
  const { totalItemCount } = useCart();
  const router = useIonRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter(o => o.status.toLowerCase() === filter);
  }, [orders, filter]);

  const fetchUserOrders = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await getOrders(user.id);
    if (!error && data) {
      setOrders(data);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    async function init() {
      setLoading(true);
      await fetchUserOrders();
      if (isMounted) setLoading(false);
    }
    init();

    const unsubscribe = subscribeToCustomerOrders(user.id, () => {
      fetchUserOrders();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.id, fetchUserOrders]);

  useIonViewWillEnter(() => {
    fetchUserOrders();
  });

  const handleRefresh = async (e: CustomEvent) => {
    await fetchUserOrders();
    e.detail.complete();
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="bg-white px-2 md:px-4">
          <IonButtons slot="start" className="md:hidden">
            <IonMenuButton className="text-slate-900" />
          </IonButtons>
          <IonTitle className="font-bold text-slate-800">Orders</IonTitle>
          <IonButtons slot="end">
            <IonButton routerLink="/customer/cart" className="relative">
              <IonIcon icon={cartOutline} className="text-2xl text-slate-700" />
              {totalItemCount > 0 && (
                <IonBadge color="danger" className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white">
                  {totalItemCount > 99 ? '99+' : totalItemCount}
                </IonBadge>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-slate-50">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>
        <div className="px-4 py-4 md:px-8 max-w-5xl mx-auto w-full">
          
          {/* Filters */}
          <div className="flex overflow-x-auto gap-2 pb-3 mb-3 hide-scrollbar px-1 items-center">
            {filterOptions.map(opt => (
              <div
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                role="button"
                className={`cursor-pointer whitespace-nowrap shrink-0 px-6 py-2 text-sm font-bold rounded-full transition-colors flex items-center justify-center border border-solid ${
                  filter === opt.value
                    ? 'border-transparent text-white'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                style={
                  filter === opt.value
                    ? { backgroundColor: '#0d9488', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }
                    : undefined
                }
              >
                {opt.label}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="mt-2">
              <OrderCardSkeleton count={3} />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto my-6">
              <div className="w-16 h-16 bg-teal-50 border border-teal-100/80 rounded-2xl flex items-center justify-center mx-auto mb-4 text-teal-600 shadow-xs">
                <IonIcon icon={bagHandleOutline} className="text-3xl" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1.5">
                {filter === 'all' ? 'No orders placed yet' : `No ${filter} orders`}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto mb-6 leading-relaxed">
                {filter === 'all' 
                  ? 'Browse verified OTC remedies from trusted local pharmacies and order in just a few taps.'
                  : `You do not have any orders currently marked as ${filter}.`}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {filter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    style={{ padding: '12px 20px', borderRadius: '14px' }}
                    className="w-full sm:w-auto border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 active:scale-95 transition-all inline-flex items-center justify-center gap-1.5"
                  >
                    <IonIcon icon={refreshOutline} className="text-base" />
                    <span>View All Orders</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => router.push('/customer/search')}
                  style={{ padding: '12px 24px', borderRadius: '14px' }}
                  className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-md shadow-teal-600/20 active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <IonIcon icon={bagHandleOutline} className="text-base" />
                  <span>Order Now / Browse Catalog</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pb-8">
              {filteredOrders.map((order) => {
                const firstItem = order.items && order.items.length > 0 ? order.items[0].item : null;
                const itemName = firstItem ? (firstItem.brand_name || firstItem.generic_name) : 'Unknown Item';
                const extraItems = order.items && order.items.length > 1 ? order.items.length - 1 : 0;
                const title = extraItems > 0 ? `${itemName} + ${extraItems} more` : itemName;
                const imageUrl = resolveMedicineImageUrl(firstItem?.image_url);
                
                return (
                  <div 
                    key={order.order_id} 
                    onClick={() => router.push(`/customer/orders/${order.order_id}`)}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="w-16 h-16 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center">
                        <img src={imageUrl} alt={itemName} className="w-full h-full object-cover" />
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h2 className="font-bold text-slate-900 text-base truncate pr-2">{title}</h2>
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold shrink-0 ${getStatusStyle(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        
                        <p className="text-[11px] text-slate-500 font-medium mb-1.5">
                          {new Date(order.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                        
                        <div className="flex items-center gap-1.5 min-w-0">
                          <IonIcon icon={storefrontOutline} className="text-slate-400 text-xs shrink-0" />
                          <span className="text-xs font-medium text-slate-600 truncate">{order.pharmacy?.name}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bottom row */}
                    <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Order #{order.order_id}</span>
                      <p className="text-sm font-bold text-teal-700">
                        ₱{order.total_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Orders;
