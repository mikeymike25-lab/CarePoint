import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CartItem } from '../../shared/types/database';

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity: number) => { success: boolean; message: string };
  updateQuantity: (itemId: number, pharmacyId: number, quantity: number) => void;
  removeFromCart: (itemId: number, pharmacyId: number) => void;
  clearCart: () => void;
  totalItemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => ({ success: false, message: '' }),
  updateQuantity: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
  totalItemCount: 0,
  subtotal: 0,
});

const STORAGE_KEY = 'carepoint_customer_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed: CartItem[] = JSON.parse(saved);
      // Structurally discard any prescription items stored in local cache
      return parsed.filter((i) => !i.requiresPrescription);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error('Failed to persist cart items to localStorage', err);
    }
  }, [items]);

  const addToCart = (item: Omit<CartItem, 'quantity'>, quantity: number) => {
    if (item.requiresPrescription) {
      return {
        success: false,
        message: 'Safety Policy: Prescription medicines cannot be added to cart or ordered online.',
      };
    }

    if (quantity <= 0) {
      return { success: false, message: 'Quantity must be at least 1.' };
    }

    const existingIndex = items.findIndex(
      (i) => i.itemId === item.itemId && i.pharmacyId === item.pharmacyId
    );

    if (existingIndex > -1) {
      const existing = items[existingIndex];
      const newQuantity = existing.quantity + quantity;
      if (newQuantity > item.maxStock) {
        return {
          success: false,
          message: `Cannot exceed stock ceiling of ${item.maxStock} units for this pharmacy.`,
        };
      }

      const updated = [...items];
      updated[existingIndex] = {
        ...existing,
        quantity: newQuantity,
      };
      setItems(updated);
      return {
        success: true,
        message: `Updated ${item.brandName || item.genericName} quantity to ${newQuantity}.`,
      };
    }

    if (quantity > item.maxStock) {
      return {
        success: false,
        message: `Requested quantity exceeds available stock (${item.maxStock}).`,
      };
    }

    setItems((prev) => [...prev, { ...item, quantity }]);
    return {
      success: true,
      message: `Added ${quantity}x ${item.brandName || item.genericName} to cart (${item.pharmacyName}).`,
    };
  };

  const updateQuantity = (itemId: number, pharmacyId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId, pharmacyId);
      return;
    }

    setItems((prev) =>
      prev.map((i) => {
        if (i.itemId === itemId && i.pharmacyId === pharmacyId) {
          const clamped = Math.min(quantity, i.maxStock);
          return { ...i, quantity: clamped };
        }
        return i;
      })
    );
  };

  const removeFromCart = (itemId: number, pharmacyId: number) => {
    setItems((prev) => prev.filter((i) => !(i.itemId === itemId && i.pharmacyId === pharmacyId)));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItemCount = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const subtotal = items.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItemCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
