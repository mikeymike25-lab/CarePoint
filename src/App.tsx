import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { AuthProvider } from './shared/context/AuthContext';
import { CustomerRoute, StaffRoute, AdminRoute } from './shared/components/RouteGuards';

// Tailwind and Ionic Core CSS (layered in index.css so Tailwind utilities take precedence)
import './index.css';

// Lazy load the isolated surfaces to ensure strict code separation
import CustomerApp from './customer/CustomerApp';
import StaffApp from './staff/StaffApp';
import AdminApp from './admin/AdminApp';

// Auth Pages
import Login from './customer/pages/Login';
import Register from './customer/pages/Register';

// Components
import CarePointChatbot from './shared/components/CarePointChatbot';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <AuthProvider>
      <IonReactRouter>
        <IonRouterOutlet>
          
          {/* Customer Routes */}
          <Route path="/customer/*" element={
            <CustomerRoute>
              <CustomerApp />
            </CustomerRoute>
          } />

          {/* Staff Routes */}
          <Route path="/staff/*" element={
            <StaffRoute>
              <StaffApp />
            </StaffRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <AdminRoute>
              <AdminApp />
            </AdminRoute>
          } />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

        </IonRouterOutlet>

        {/* Global Floating CarePoint AI Health Chatbot */}
        <CarePointChatbot />
      </IonReactRouter>
    </AuthProvider>
  </IonApp>
);

export default App;
