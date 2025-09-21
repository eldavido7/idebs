"use client";

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  useEffect,
} from "react";
import type { Product, ProductVariant } from "@/types";
import { useToast } from "@/hooks/use-toast";

// Cart item type (variant-aware)
export type CartItem = {
  product: Product;
  variantId?: string;
  variantName?: string;
  price: number; // effective price (variant or product)
  quantity: number;
};

// Cart state
type CartState = {
  items: CartItem[];
  total: number;
  itemCount: number;
};

// Actions
type CartAction =
  | {
    type: "ADD_ITEM";
    payload: { product: Product; quantity: number; variant?: ProductVariant };
  }
  | {
    type: "REMOVE_ITEM";
    payload: { productId: string; variantId?: string };
  }
  | {
    type: "UPDATE_QUANTITY";
    payload: { productId: string; variantId?: string | undefined; quantity: number };
  }
  | { type: "CLEAR_CART" }
  | { type: "RESTORE_STATE"; payload: CartState }; // used when loading from localStorage

const initialState: CartState = {
  items: [],
  total: 0,
  itemCount: 0,
};

// helper to recalc totals
function calculateTotals(items: CartItem[]) {
  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);
  return { total, itemCount };
}

// reducer
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "RESTORE_STATE": {
      // Ensure totals are correct even if saved state was stale
      const items = action.payload.items || [];
      return { ...action.payload, ...calculateTotals(items) };
    }

    case "ADD_ITEM": {
      const { product, quantity, variant } = action.payload;
      const variantId = variant?.id ?? undefined;
      const effectivePrice = (variant?.price ?? product.price ?? 0) as number;

      const existingIndex = state.items.findIndex(
        (it) => it.product.id === product.id && it.variantId === variantId
      );

      let items: CartItem[] = [];
      if (existingIndex > -1) {
        items = state.items.map((it, idx) =>
          idx === existingIndex ? { ...it, quantity: it.quantity + quantity } : it
        );
      } else {
        items = [
          ...state.items,
          {
            product,
            variantId,
            variantName: variant?.name ?? undefined,
            price: effectivePrice,
            quantity,
          },
        ];
      }

      return { items, ...calculateTotals(items) };
    }

    case "REMOVE_ITEM": {
      const { productId, variantId } = action.payload;
      const items = state.items.filter(
        (it) => !(it.product.id === productId && it.variantId === (variantId ?? undefined))
      );
      return { items, ...calculateTotals(items) };
    }

    case "UPDATE_QUANTITY": {
      const { productId, variantId, quantity } = action.payload;
      if (quantity <= 0) {
        return cartReducer(state, { type: "REMOVE_ITEM", payload: { productId, variantId } });
      }
      const items = state.items.map((it) =>
        it.product.id === productId && it.variantId === (variantId ?? undefined)
          ? { ...it, quantity }
          : it
      );
      return { items, ...calculateTotals(items) };
    }

    case "CLEAR_CART":
      return initialState;

    default:
      return state;
  }
}

// Context type
type CartContextType = {
  items: CartItem[];
  total: number;
  itemCount: number;
  addItem: (product: Product, quantity: number, variant?: ProductVariant) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

// Provider
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { toast } = useToast();

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cart");
      if (!raw) return;
      const parsed = JSON.parse(raw) as CartState;
      // Normalize parsed structure: ensure items array exists
      const items = Array.isArray(parsed.items) ? parsed.items : [];
      dispatch({
        type: "RESTORE_STATE",
        payload: {
          items,
          total: parsed.total ?? calculateTotals(items).total,
          itemCount: parsed.itemCount ?? calculateTotals(items).itemCount,
        },
      });
    } catch (err) {
      console.error("Failed to restore cart from localStorage:", err);
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(state));
    } catch (err) {
      console.error("Failed to save cart to localStorage:", err);
      toast({
        title: "Storage Error",
        description: "Unable to save cart. Your cart may not persist.",
        variant: "destructive",
      });
    }
  }, [state]);

  // Actions
  const addItem = (product: Product, quantity: number, variant?: ProductVariant) => {
    const effectivePrice = variant?.price ?? product.price;
    if (effectivePrice == null || effectivePrice <= 0) {
      toast({
        title: "Invalid price",
        description: `No valid price found for ${product.title}${variant ? ` (${variant.name})` : ''}.`,
        variant: "destructive",
      });
      return;
    }
    dispatch({ type: "ADD_ITEM", payload: { product, quantity, variant } });
    toast({
      title: "Added to cart successfully!",
      description: `${product.title}${variant ? ` (${variant.name ?? ""})` : ""} has been added to your cart.`,
    });
  };

  const removeItem = (productId: string, variantId?: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: { productId, variantId } });
  };

  const updateQuantity = (productId: string, variantId: string | undefined, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { productId, variantId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" });
  };

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        total: state.total,
        itemCount: state.itemCount,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// Hook
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
