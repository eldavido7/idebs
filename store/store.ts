import { create } from "zustand"
import { persist } from "zustand/middleware";
import type { Product, Order, Discount, AnalyticsOrder, OrderWithItems, User, ShippingOption, SalesData, ProductPerformance } from "@/types"

interface StoreState {
  // Products
  products: Product[];
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, "id" | "createdAt">) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  updateVariant: (productId: string, variantId: string, data: { inventory?: number }) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Orders
  orders: Order[];
  fetchOrders: () => Promise<void>;
  addOrder: (
    order: Omit<Order, "id" | "createdAt" | "updatedAt" | "subtotal" | "total"> & {
      items: { productId: string; quantity: number }[];
      shippingOptionId?: string | null;
      shippingCost?: number | null;
      paymentReference?: string | null;
    }
  ) => Promise<void>;
  updateOrder: (id: string, order: Partial<Order>) => Promise<void>;

  // Discounts
  discounts: Discount[];
  fetchDiscounts: () => Promise<void>;
  addDiscount: (discount: Omit<Discount, "id" | "usageCount" | "createdAt" | "updatedAt">) => Promise<void>;
  updateDiscount: (id: string, discount: Partial<Discount>) => Promise<void>;
  deleteDiscount: (id: string) => Promise<void>;
}

// Users
interface AuthStore {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  // Products
  products: [],

  fetchProducts: async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    set({ products: data });
  },

  addProduct: async (product: Omit<Product, "id" | "createdAt">) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });

      if (!res.ok) throw new Error("Failed to add product");

      // Refetch all products after successful add
      const updatedRes = await fetch("/api/products");
      const updatedProducts = await updatedRes.json();
      set({ products: updatedProducts });
    } catch (error) {
      console.error("[ADD_PRODUCT_STORE]", error);
    }
  },

  updateProduct: async (id, updatedProduct) => {
    await fetch(`/api/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(updatedProduct),
      headers: { "Content-Type": "application/json" },
    });
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...updatedProduct } : p
      ),
    }));
  },

  updateVariant: async (productId: string, variantId: string, data: { inventory?: number }) => {
    try {
      const product = get().products.find((p) => p.id === productId);
      if (!product) throw new Error("Product not found");

      const variants = product.variants?.map((v) =>
        v.id === variantId ? { ...v, inventory: data.inventory ?? v.inventory } : v
      ) ?? [];

      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: product.title,
          description: product.description,
          price: product.price,
          inventory: product.inventory,
          category: product.category,
          subcategory: product.subcategory,
          tags: product.tags,
          barcode: product.barcode,
          imageUrl: product.imageUrl,
          imagePublicId: product.imagePublicId,
          variants,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update variant");
      }

      const updatedProduct = await response.json();
      set((state) => ({
        products: state.products.map((p) =>
          p.id === productId ? updatedProduct : p
        ),
      }));
    } catch (err) {
      console.error("[UPDATE_VARIANT_ERROR]", err);
      throw err;
    }
  },

  deleteProduct: async (id) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete product");
      }

      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
      }));
    } catch (error) {
      console.error("[DELETE_PRODUCT]", error);
      throw error;
    }
  },

  // Orders
  orders: [],

  fetchOrders: async () => {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const orders: Order[] = await res.json();
      set({ orders });
    } catch (error) {
      console.error("[FETCH_ORDERS]", error);
    }
  },

  addOrder: async (order) => {
    try {
      const { products, discounts } = get();
      const { shippingOptions } = useSettingsStore.getState();

      // Calculate subtotal from items
      const itemsWithSubtotal = order.items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found in state`);

        const variant = item.variantId
          ? product.variants?.find((v) => v.id === item.variantId) || null
          : null;

        const price = variant?.price ?? product.price;
        if (price == null) throw new Error(`No price found for product ${product.id}`);

        return {
          productId: item.productId,
          variantId: item.variantId ?? null,
          product,
          variant,
          quantity: item.quantity,
          subtotal: price * item.quantity,
        };
      });

      const subtotal = itemsWithSubtotal.reduce((sum, item) => sum + item.subtotal, 0);
      let shippingCost = 0;

      // Determine if this is an admin checkout
      const isAdminCheckout = Boolean(order.cashierId);

      // Validate shipping option
      if (order.shippingOptionId) {
        const shippingOption = shippingOptions.find((s) => s.id === order.shippingOptionId);
        if (!shippingOption || shippingOption.status !== "ACTIVE") {
          throw new Error("Invalid or inactive shipping option");
        }
        shippingCost = shippingOption.price;
        if (order.shippingCost !== undefined && order.shippingCost !== shippingCost) {
          throw new Error("Provided shipping cost does not match selected option");
        }
      } else if (order.shippingCost !== undefined && order.shippingCost !== 0) {
        if (!isAdminCheckout) {
          throw new Error("Shipping cost provided without shipping option");
        }
      }

      // For admin checkout, default to no shipping cost if not specified
      if (isAdminCheckout && !order.shippingOptionId) {
        shippingCost = 0;
      }

      // Validate and apply discount
      let discount: Discount | null = null;
      let total = subtotal + shippingCost;

      if (order.discountId) {
        discount = discounts.find((d) => d.id === order.discountId) || null;
        if (!discount) throw new Error("Invalid discount");

        const isApplicableToItems = itemsWithSubtotal.some((item) =>
          discount?.products?.some((p) => p.id === item.productId) ||
          discount?.variants?.some((v) => v.id === item.variantId)
        );

        if (
          !discount.isActive ||
          (discount.usageLimit && discount.usageCount >= discount.usageLimit) ||
          (discount.startsAt && new Date() < new Date(discount.startsAt)) ||
          (discount.endsAt && new Date() > new Date(discount.endsAt)) ||
          (discount.minSubtotal && subtotal < discount.minSubtotal) ||
          (discount.products?.length || discount.variants?.length) && !isApplicableToItems
        ) {
          throw new Error("Discount is not applicable");
        }

        if (discount.type === "percentage") {
          total = subtotal * (1 - discount.value / 100) + shippingCost;
        } else if (discount.type === "fixed_amount") {
          total = Math.max(0, subtotal - discount.value) + shippingCost;
        } else if (discount.type === "free_shipping") {
          total = subtotal;
          shippingCost = 0;
        }
      }

      const newOrder = {
        ...order,
        items: itemsWithSubtotal,
        subtotal,
        shippingCost,
        total,
        discount,
        paymentReference: order.paymentReference || null,
        status: order.status || "PENDING", // Include status, default to PENDING if not provided
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });

      if (!res.ok) throw new Error("Failed to create order");
      const createdOrder = await res.json();
      set((state) => ({ orders: [createdOrder, ...state.orders] }));
    } catch (error) {
      console.error("[ADD_ORDER]", error);
      throw error;
    }
  },

  updateOrder: async (id, updatedOrder) => {
    try {
      const { products, discounts } = get();
      const { shippingOptions } = useSettingsStore.getState();

      let subtotal = 0;
      let shippingCost = updatedOrder.shippingCost ?? 0;
      let total = 0;
      let discount: Discount | null = updatedOrder.discount || null;
      let shippingOptionId = updatedOrder.shippingOptionId;

      // Recalculate subtotal based on items
      let itemsWithSubtotal = updatedOrder.items;
      if (updatedOrder.items) {
        itemsWithSubtotal = updatedOrder.items.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          if (!product) throw new Error(`Product ${item.productId} not found in state`);

          const variant = item.variantId
            ? product.variants?.find((v) => v.id === item.variantId) || null
            : null;

          const price = variant?.price ?? product.price ?? 0;
          const subtotal = price * item.quantity;

          return {
            ...item,
            product,
            variant,
            subtotal,
          };
        });
        subtotal = itemsWithSubtotal.reduce((sum, item) => sum + item.subtotal, 0);
      }

      // Validate shipping option
      if (updatedOrder.shippingOptionId !== undefined) {
        if (updatedOrder.shippingOptionId) {
          const shippingOption = shippingOptions.find((s) => s.id === updatedOrder.shippingOptionId);
          if (!shippingOption || shippingOption.status !== "ACTIVE") {
            throw new Error("Invalid or inactive shipping option");
          }
          shippingCost = shippingOption.price;
          if (updatedOrder.shippingCost !== undefined && updatedOrder.shippingCost !== shippingOption.price) {
            throw new Error("Provided shipping cost does not match selected option");
          }
        } else if (updatedOrder.shippingCost !== undefined && updatedOrder.shippingCost !== 0) {
          throw new Error("Shipping cost provided without shipping option");
        } else {
          shippingCost = 0;
        }
      }

      // Validate and apply discount
      if (updatedOrder.discountId !== undefined) {
        discount = discounts.find((d) => d.id === updatedOrder.discountId) ?? null;
        if (updatedOrder.discountId && !discount) throw new Error("Invalid discount");

        if (discount) {
          if (
            !discount.isActive ||
            (discount.usageLimit && discount.usageCount >= discount.usageLimit) ||
            (discount.startsAt && new Date() < new Date(discount.startsAt)) ||
            (discount.endsAt && new Date() > new Date(discount.endsAt)) ||
            (discount.minSubtotal && subtotal < discount.minSubtotal) ||
            (discount.products?.length && !itemsWithSubtotal?.some((item) =>
              discount?.products?.some((p) => p.id === item.productId)
            )) ||
            (discount.variants?.length && !itemsWithSubtotal?.some((item) =>
              discount?.variants?.some((v) => v.id === item.variantId)
            ))
          ) {
            throw new Error("Discount is not applicable");
          }

          if (discount.type === "percentage") {
            total = subtotal * (1 - discount.value / 100) + shippingCost;
          } else if (discount.type === "fixed_amount") {
            total = Math.max(0, subtotal - discount.value) + shippingCost;
          } else if (discount.type === "free_shipping") {
            total = subtotal;
            shippingCost = 0;
          }
        } else {
          total = subtotal + shippingCost;
        }
      } else {
        total = subtotal + shippingCost;
      }

      const updated = {
        ...updatedOrder,
        items: itemsWithSubtotal,
        subtotal,
        shippingOptionId,
        shippingCost,
        total,
        discount,
        discountId: discount?.id ?? null,
        paymentReference: updatedOrder.paymentReference ?? null,
      };

      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      if (!res.ok) throw new Error("Failed to update order");
      const updatedOrderResponse = await res.json();
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, ...updatedOrderResponse } : o
        ),
      }));
    } catch (error) {
      console.error("[UPDATE_ORDER]", error);
      throw error;
    }
  },

  // Discounts
  discounts: [],

  fetchDiscounts: async () => {
    try {
      const res = await fetch("/api/discounts");
      if (!res.ok) throw new Error("Failed to fetch discounts");
      const data = await res.json();
      set({ discounts: data });
    } catch (error) {
      console.error("[FETCH_DISCOUNTS]", error);
    }
  },

  addDiscount: async (discount) => {
    try {
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discount),
      });
      if (!res.ok) throw new Error("Failed to create discount");
      const newDiscount = await res.json();
      set((state) => ({
        discounts: [newDiscount, ...state.discounts],
      }));
    } catch (error) {
      console.error("[ADD_DISCOUNT]", error);
    }
  },

  updateDiscount: async (id, updatedDiscount) => {
    try {
      const res = await fetch(`/api/discounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedDiscount),
      });
      if (!res.ok) throw new Error("Failed to update discount");
      const updated = await res.json();

      set((state) => ({
        discounts: state.discounts.map((discount) =>
          discount.id === id ? updated : discount,
        ),
      }));
    } catch (error) {
      console.error("[UPDATE_DISCOUNT]", error);
    }
  },

  deleteDiscount: async (id) => {
    try {
      await fetch(`/api/discounts/${id}`, { method: "DELETE" });
      set((state) => ({
        discounts: state.discounts.filter((d) => d.id !== id),
      }));
    } catch (error) {
      console.error("[DELETE_DISCOUNT]", error);
    }
  },
}))

export function getTopProducts(orders: OrderWithItems[]) {
  const productStats: Record<
    string,
    {
      title: string;
      totalSold: number;
      totalRevenue: number;
      variantBreakdown?: Record<string, { name: string; sold: number; revenue: number }>;
    }
  > = {};

  orders.forEach((order) => {
    if (order.status !== "DELIVERED") return;

    order.items.forEach((item) => {
      const productId = item.product.id;
      const effectivePrice = item.variant?.price ?? item.product.price ?? 0;
      const itemRevenue = effectivePrice * item.quantity;

      // Initialize product stats if not exists
      if (!productStats[productId]) {
        productStats[productId] = {
          title: item.product.title,
          totalSold: 0,
          totalRevenue: 0,
          variantBreakdown: {},
        };
      }

      // Update product totals
      productStats[productId].totalSold += item.quantity;
      productStats[productId].totalRevenue += itemRevenue;

      // Track variant-specific stats if variant exists
      if (item.variant && item.variantId) {
        if (!productStats[productId].variantBreakdown![item.variantId]) {
          productStats[productId].variantBreakdown![item.variantId] = {
            name: item.variant.name || `Variant ${item.variantId.slice(0, 8)}`,
            sold: 0,
            revenue: 0,
          };
        }
        productStats[productId].variantBreakdown![item.variantId].sold += item.quantity;
        productStats[productId].variantBreakdown![item.variantId].revenue += itemRevenue;
      }
    });
  });

  const products = Object.values(productStats);

  const topByRevenue = [...products].sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  );
  const topByQuantity = [...products].sort(
    (a, b) => b.totalSold - a.totalSold
  );

  return {
    topByRevenue,
    topByQuantity,
  };
}

export function getSalesData(orders: AnalyticsOrder[]): SalesData[] {
  const revenueByMonth: Record<string, number> = {};
  const orderCountByMonth: Record<string, number> = {};

  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!orderCountByMonth[month]) {
      orderCountByMonth[month] = 0;
    }
    orderCountByMonth[month] += 1;

    if (order.status === "DELIVERED") {
      if (!revenueByMonth[month]) {
        revenueByMonth[month] = 0;
      }
      // Use the order's total which already accounts for variant pricing
      revenueByMonth[month] += order.total;
    }
  });

  const months = Object.keys(orderCountByMonth).sort();
  return months.map((month) => ({
    date: month,
    revenue: revenueByMonth[month] || 0,
    orders: orderCountByMonth[month],
  }));
}
export function getVariantAnalytics(orders: OrderWithItems[]) {
  const variantStats: Record<
    string,
    {
      productTitle: string;
      variantName: string;
      totalSold: number;
      totalRevenue: number;
      averagePrice: number;
    }
  > = {};

  orders.forEach((order) => {
    if (order.status !== "DELIVERED") return;

    order.items.forEach((item) => {
      if (!item.variant || !item.variantId) return; // Skip items without variants

      const variantKey = `${item.product.id}-${item.variantId}`;
      const effectivePrice = item.variant.price ?? item.product.price ?? 0;
      const itemRevenue = effectivePrice * item.quantity;

      if (!variantStats[variantKey]) {
        variantStats[variantKey] = {
          productTitle: item.product.title,
          variantName: item.variant.name || `Variant ${item.variantId.slice(0, 8)}`,
          totalSold: 0,
          totalRevenue: 0,
          averagePrice: effectivePrice,
        };
      }

      variantStats[variantKey].totalSold += item.quantity;
      variantStats[variantKey].totalRevenue += itemRevenue;
      variantStats[variantKey].averagePrice =
        variantStats[variantKey].totalRevenue / variantStats[variantKey].totalSold;
    });
  });

  const variants = Object.values(variantStats);

  return {
    topVariantsByRevenue: [...variants].sort((a, b) => b.totalRevenue - a.totalRevenue),
    topVariantsByQuantity: [...variants].sort((a, b) => b.totalSold - a.totalSold),
  };
}

export function getCategoryAnalytics(products: Product[], orders: OrderWithItems[]) {
  const categoryStats: Record<
    string,
    {
      name: string;
      productCount: number;
      totalRevenue: number;
      totalUnitsSold: number;
      averagePrice: number;
    }
  > = {};

  // Initialize categories from products
  products.forEach((product) => {
    if (!categoryStats[product.category]) {
      categoryStats[product.category] = {
        name: product.category,
        productCount: 0,
        totalRevenue: 0,
        totalUnitsSold: 0,
        averagePrice: 0,
      };
    }
    categoryStats[product.category].productCount++;
  });

  // Calculate revenue and units sold from delivered orders
  orders.forEach((order) => {
    if (order.status !== "DELIVERED") return;

    order.items.forEach((item) => {
      const category = item.product.category;
      const effectivePrice = item.variant?.price ?? item.product.price ?? 0;
      const itemRevenue = effectivePrice * item.quantity;

      if (categoryStats[category]) {
        categoryStats[category].totalRevenue += itemRevenue;
        categoryStats[category].totalUnitsSold += item.quantity;
      }
    });
  });

  // Calculate average prices
  Object.values(categoryStats).forEach((category) => {
    if (category.totalUnitsSold > 0) {
      category.averagePrice = category.totalRevenue / category.totalUnitsSold;
    }
  });

  return Object.values(categoryStats).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// Function to get low stock alerts considering variants
export function getLowStockAlerts(products: Product[], threshold: number = 10) {
  const alerts: Array<{
    productId: string;
    productTitle: string;
    type: 'product' | 'variant';
    variantId?: string;
    variantName?: string;
    currentStock: number;
    threshold: number;
  }> = [];

  products.forEach((product) => {
    // Check main product inventory
    if ((product.inventory ?? 0) < threshold) {
      alerts.push({
        productId: product.id,
        productTitle: product.title,
        type: 'product',
        currentStock: product.inventory ?? 0,
        threshold,
      });
    }

    // Check variant inventories
    product.variants?.forEach((variant) => {
      if (variant.inventory < threshold) {
        alerts.push({
          productId: product.id,
          productTitle: product.title,
          type: 'variant',
          variantId: variant.id,
          variantName: variant.name || `Variant ${variant.id.slice(0, 8)}`,
          currentStock: variant.inventory,
          threshold,
        });
      }
    });
  });

  return alerts.sort((a, b) => a.currentStock - b.currentStock);
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          const data = await res.json();

          if (res.ok && data.success) {
            set({ user: data.user });
            const { updateUserActivity } = useSettingsStore.getState();
            await updateUserActivity(data.user.id); // Update lastActive on login
            return true;
          }

          return false;
        } catch (err) {
          console.error("Login error:", err);
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        set({ user: null });
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth");
        }
        window.location.href = "/login"; // force redirect
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: "auth", // localStorage key
      partialize: (state) => ({ user: state.user }), // only persist user
    }
  )
);

interface SettingsState {
  users: User[];
  shippingOptions: ShippingOption[];
  fetchSettings: () => Promise<void>;
  createUser: (user: Partial<User>) => Promise<void>;
  updateUser: (user: Partial<User> & { id: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  createShipping: (option: Partial<ShippingOption>) => Promise<void>;
  updateShipping: (option: Partial<ShippingOption> & { id: string }) => Promise<void>;
  deleteShipping: (id: string) => Promise<void>;
  updateUserActivity: (userId: string) => Promise<void>; // New function
}

export const useSettingsStore = create<SettingsState>((set) => ({
  users: [],
  shippingOptions: [],

  fetchSettings: async () => {
    const [usersRes, shippingRes] = await Promise.all([
      fetch("/api/settings/users"),
      fetch("/api/settings/shipping-options"),
    ]);

    const [users, shippingOptions] = await Promise.all([
      usersRes.json(),
      shippingRes.json(),
    ]);

    set({ users, shippingOptions });
  },

  createUser: async (user) => {
    const payload = { name: user.name, email: user.email, password: user.password, role: user.role };
    const res = await fetch("/api/settings/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Failed to create user: ${res.status} ${res.statusText} - ${JSON.stringify(errorData)}`);
    }
    const newUser = await res.json();
    set((state) => ({ users: [...state.users, newUser] }));
  },

  updateUser: async (user) => {
    await fetch(`/api/settings/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    set((state) => ({
      users: state.users.map((u) => (u.id === user.id ? { ...u, ...user } : u)),
    }));
  },

  updateUserActivity: async (userId) => {
    const res = await fetch("/api/settings/users/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Failed to update activity: ${res.status} ${res.statusText} - ${JSON.stringify(errorData)}`);
    }
    const updatedUser = await res.json();
    set((state) => ({
      users: state.users.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
    }));
  },

  deleteUser: async (id) => {
    await fetch(`/api/settings/users/${id}`, { method: "DELETE" });
    set((state) => ({
      users: state.users.filter((u) => u.id !== id),
    }));
  },

  createShipping: async (option) => {
    const res = await fetch("/api/settings/shipping-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(option),
    });
    if (!res.ok) {
      throw new Error(`Failed to create shipping option: ${res.status} ${res.statusText}`);
    }
    const newOption = await res.json();
    set((state) => ({
      shippingOptions: [...state.shippingOptions, newOption],
    }));
  },

  updateShipping: async (option) => {
    await fetch(`/api/settings/shipping-options/${option.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(option),
    });
    set((state) => ({
      shippingOptions: state.shippingOptions.map((s) =>
        s.id === option.id ? { ...s, ...option } : s
      ),
    }));
  },

  deleteShipping: async (id) => {
    await fetch(`/api/settings/shipping-options/${id}`, { method: "DELETE" });
    set((state) => ({
      shippingOptions: state.shippingOptions.filter((s) => s.id !== id),
    }));
  },
}));
