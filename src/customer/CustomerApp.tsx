import React from 'react';
import { Navigate, Route, useLocation } from 'react-router-dom';
import { 
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge, IonRouterOutlet, IonSplitPane 
} from '@ionic/react';
import { 
  homeOutline, homeSharp, 
  searchOutline, searchSharp, 
  personOutline, personSharp, 
  documentTextOutline, documentTextSharp 
} from 'ionicons/icons';
import { CartProvider, useCart } from './context/CartContext';

// Pages
import Home from './pages/Home';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Developers from './pages/Developers';
import MedicineDetail from './pages/MedicineDetail';
import Cart from './pages/Cart';
import EditProfile from './pages/EditProfile';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Inquiries from './pages/Inquiries';
import Chat from './pages/Chat';
import AboutApp from './pages/AboutApp';
import SavedAddresses from './pages/SavedAddresses';
import ChangePassword from './pages/ChangePassword';
import PaymentMethods from './pages/PaymentMethods';
import Notifications from './pages/Notifications';
import CompanyHistory from './pages/CompanyHistory';
import { NotificationProvider } from './context/NotificationContext';

// Components
import SideMenu from './components/SideMenu';

// Core Tab Routes

const CustomerTabs: React.FC = () => {
  const { totalItemCount } = useCart();
  const location = useLocation();

  const isHomeActive = location.pathname.startsWith('/customer/home');
  const isSearchActive = location.pathname.startsWith('/customer/search');
  const isOrdersActive = location.pathname.startsWith('/customer/orders');
  const isProfileActive = location.pathname.startsWith('/customer/profile');

  return (
    <IonTabs>
      <IonRouterOutlet>
        {/* Core Tab Routes */}
        <Route path="/customer/home" element={<Home />} />
        <Route path="/customer/search" element={<Search />} />
        <Route path="/customer/medicine/:id" element={<MedicineDetail />} />
        <Route path="/customer/cart" element={<Cart />} />
        
        {/* Order Routes */}
        <Route path="/customer/orders" element={<Orders />} />
        <Route path="/customer/orders/:id" element={<OrderDetail />} />
        
        {/* Profile Routes */}
        <Route path="/customer/profile" element={<Profile />} />
        <Route path="/customer/profile/edit" element={<EditProfile />} />
        <Route path="/customer/change-password" element={<ChangePassword />} />
        <Route path="/customer/payment-methods" element={<PaymentMethods />} />
        <Route path="/customer/addresses" element={<SavedAddresses />} />
        <Route path="/customer/developers" element={<Developers />} />
        <Route path="/customer/inquiries" element={<Inquiries />} />
        <Route path="/customer/messages/:type/:id" element={<Chat />} />
        <Route path="/customer/notifications" element={<Notifications />} />
        <Route path="/customer/about" element={<AboutApp />} />
        <Route path="/customer/company-history" element={<CompanyHistory />} />

        {/* Default route redirects to home */}
        <Route path="/customer" element={<Navigate to="/customer/home" replace />} />
      </IonRouterOutlet>

      {/* Bottom Navigation Bar */}
      <IonTabBar slot="bottom" className="border-t border-slate-200 shadow-sm py-1">
        <IonTabButton tab="home" href="/customer/home">
          <IonIcon icon={isHomeActive ? homeSharp : homeOutline} />
          <IonLabel className="text-xs font-medium mt-1">Home</IonLabel>
        </IonTabButton>

        <IonTabButton tab="search" href="/customer/search">
          <IonIcon icon={isSearchActive ? searchSharp : searchOutline} />
          <IonLabel className="text-xs font-medium mt-1">Discover</IonLabel>
        </IonTabButton>

        <IonTabButton tab="orders" href="/customer/orders">
          <IonIcon icon={isOrdersActive ? documentTextSharp : documentTextOutline} />
          <IonLabel className="text-xs font-medium mt-1">Orders</IonLabel>
          {totalItemCount > 0 && (
            <IonBadge color="primary" className="text-[10px] font-bold">
              {totalItemCount > 99 ? '99+' : totalItemCount}
            </IonBadge>
          )}
        </IonTabButton>

        <IonTabButton tab="profile" href="/customer/profile">
          <IonIcon icon={isProfileActive ? personSharp : personOutline} />
          <IonLabel className="text-xs font-medium mt-1">Profile</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
};

const CustomerApp: React.FC = () => {
  return (
    <NotificationProvider>
      <CartProvider>
        <IonSplitPane 
          contentId="main-content"
          style={{
            '--side-width': '240px',
            '--side-min-width': '220px',
            '--side-max-width': '240px',
            '--border': '1px solid #f1f5f9'
          } as React.CSSProperties}
        >
          <SideMenu />
          <div id="main-content" className="ion-page">
            <CustomerTabs />
          </div>
        </IonSplitPane>
      </CartProvider>
    </NotificationProvider>
  );
};


export default CustomerApp;
