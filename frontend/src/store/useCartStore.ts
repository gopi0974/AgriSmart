import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  vegetable: string;
  district: string;
  quantity: number;
  price: number;
  farmer_name: string;
  farmer_id: string;
  mobile: string;
  image?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string, vegetable: string) => void;
  updateQuantity: (id: string, vegetable: string, qty: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const existing = get().items.find(
          (i) => i.id === item.id && i.vegetable === item.vegetable
        );
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.id === item.id && i.vegetable === item.vegetable
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          });
        } else {
          set({ items: [...get().items, item] });
        }
      },
      removeItem: (id, vegetable) => {
        set({
          items: get().items.filter((i) => !(i.id === id && i.vegetable === vegetable)),
        });
      },
      updateQuantity: (id, vegetable, qty) => {
        set({
          items: get().items.map((i) =>
            i.id === id && i.vegetable === vegetable ? { ...i, quantity: Math.max(1, qty) } : i
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        return get().items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      },
    }),
    { name: 'agri-cart-storage' }
  )
);
