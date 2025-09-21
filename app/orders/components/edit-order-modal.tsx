"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, AlertCircle, Plus, Loader2 } from "lucide-react";
import { useStore, useSettingsStore } from "@/store/store";
import { toast } from "@/components/ui/use-toast";
import type { Order } from "@/types";
import { useShallow } from "zustand/react/shallow";

interface EditOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  onUpdateOrder: (id: string, order: Partial<Order>) => Promise<void>;
}

export function EditOrderModal({
  open,
  onOpenChange,
  order,
  onUpdateOrder,
}: EditOrderModalProps) {
  const { products, discounts, fetchOrders, fetchProducts, fetchDiscounts } = useStore(
    useShallow((state) => ({
      products: state.products,
      discounts: state.discounts,
      fetchOrders: state.fetchOrders,
      fetchProducts: state.fetchProducts,
      fetchDiscounts: state.fetchDiscounts,
    }))
  );
  const { shippingOptions } = useSettingsStore(useShallow((state) => ({
    shippingOptions: state.shippingOptions,
  })));

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [items, setItems] = useState<
    { productId: string; variantId?: string; quantity: number; title?: string; price?: number }[]
  >([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string | null>(null);
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string>("");
  const [status, setStatus] = useState<Order["status"] | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [total, setTotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [searchOpen, setSearchOpen] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof products>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (order?.id) {
      setFirstName(order.firstName);
      setLastName(order.lastName);
      setEmail(order.email);
      setPhone(order.phone);
      setAddress(order.address);
      setCity(order.city);
      setState(order.state);
      setPostalCode(order.postalCode);
      setCountry(order.country);
      setStatus(order.status);
      setSelectedDiscountId(order.discountId || null);
      setSelectedShippingOptionId(order.shippingOptionId || null);
      setItems(
        order.items.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          const variant = item.variantId
            ? product?.variants?.find((v) => v.id === item.variantId)
            : null;
          return {
            productId: item.productId,
            variantId: item.variantId ?? undefined,
            quantity: item.quantity,
            title: product ? `${product.title}${variant ? ` (${variant.name})` : ''} ` : '',
            price: variant?.price ?? product?.price ?? 0,
          };
        })
      );
      setSubtotal(order.subtotal || 0);
      setShippingCost(order.shippingCost || 0);
      setTotal(order.total || 0);
    }
  }, [order, products]);

  useEffect(() => {
    Promise.all([
      !products.length && fetchProducts(),
      !discounts.length && fetchDiscounts(),
      !useSettingsStore.getState().shippingOptions.length && useSettingsStore.getState().fetchSettings(),
    ]).catch((err) => {
      console.error("[FETCH_DATA]", err);
      toast({
        title: "Error",
        description: "Failed to fetch data.",
        variant: "destructive",
      });
    });
  }, []);

  const calculateTotals = () => {
    let calculatedSubtotal = 0;
    let calculatedTotal = 0;
    let calculatedShippingCost = 0;
    let calculatedDiscountAmount = 0;
    let error = "";

    try {
      for (const item of items) {
        if (!item.productId) {
          error = "Please select a product for all items.";
          break;
        }
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          error = `Product ${item.productId} not found.`;
          break;
        }
        const variant = item.variantId
          ? product.variants?.find((v) => v.id === item.variantId)
          : null;
        const price = variant?.price ?? product.price ?? 0;
        const inventory = variant?.inventory ?? product.inventory ?? 0;
        if (inventory < item.quantity) {
          error = `${product.title}${variant ? ` (${variant.name})` : ''} is out of stock(available: ${inventory}).`;
          break;
        }
        calculatedSubtotal += price * item.quantity;
      }

      calculatedTotal = calculatedSubtotal;

      if (selectedShippingOptionId) {
        const shippingOption = shippingOptions.find((s) => s.id === selectedShippingOptionId);
        if (!shippingOption || shippingOption.status !== "ACTIVE") {
          error = "Selected shipping option is invalid or inactive.";
        } else {
          calculatedShippingCost = shippingOption.price;
          calculatedTotal += calculatedShippingCost;
        }
      }

      if (selectedDiscountId && !error) {
        const discount = discounts.find((d) => d.id === selectedDiscountId);
        if (!discount) {
          error = "Selected discount is invalid.";
        } else if (!discount.isActive) {
          error = `Discount ${discount.code} is not active.`;
        } else if (discount.startsAt && new Date(discount.startsAt) > new Date()) {
          error = `Discount ${discount.code} is not yet valid.`;
        } else if (discount.endsAt && new Date(discount.endsAt) < new Date()) {
          error = `Discount ${discount.code} has expired.`;
        } else if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
          error = `Discount ${discount.code} has reached its usage limit.`;
        } else if (discount.minSubtotal && calculatedSubtotal < discount.minSubtotal) {
          error = `Order subtotal(₦${calculatedSubtotal.toFixed(2)}) is below the minimum required(₦${discount.minSubtotal.toFixed(2)}) for discount ${discount.code}.`;
        } else if (discount.products?.length || discount.variants?.length) {
          const isApplicable = items.some((item) =>
            discount.products?.some((p) => p.id === item.productId) ||
            discount.variants?.some((v) => v.id === item.variantId)
          );
          if (!isApplicable) {
            error = `Selected products / variants do not qualify for discount ${discount.code}.`;
          }
        }

        if (!error && discount) {
          if (discount.type === "percentage") {
            calculatedDiscountAmount = (discount.value / 100) * calculatedSubtotal;
          } else if (discount.type === "fixed_amount") {
            calculatedDiscountAmount = discount.value;
          } else if (discount.type === "free_shipping") {
            calculatedDiscountAmount = calculatedShippingCost;
            calculatedShippingCost = 0;
          }
          calculatedTotal = Math.max(0, calculatedSubtotal - calculatedDiscountAmount) + calculatedShippingCost;
        }
      }

      setSubtotal(calculatedSubtotal);
      setShippingCost(calculatedShippingCost);
      setTotal(calculatedTotal);
      setDiscountAmount(calculatedDiscountAmount);
      setDiscountError(error);
    } catch (err) {
      setDiscountError("Failed to calculate totals.");
      console.error("[CALCULATE_TOTALS]", err);
    }
  };

  useEffect(() => {
    calculateTotals();
  }, [items, selectedDiscountId, selectedShippingOptionId, products, discounts, shippingOptions]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length >= 2) {
      const results = products
        .filter(
          (product) =>
            (product.title.toLowerCase().includes(query.toLowerCase()) ||
              product.description?.toLowerCase().includes(query.toLowerCase()) ||
              product.category?.toLowerCase().includes(query.toLowerCase()) ||
              product.tags?.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))) &&
            ((product.inventory ?? 0) > 0 || product.variants?.some((v) => v.inventory > 0))
        )
        .slice(0, 5);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleProductSelect = (index: number, product: (typeof products)[0]) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      productId: product.id,
      variantId: undefined,
      title: product.title,
      price: product.price,
    };
    setItems(updatedItems);
    setSearchOpen(null);
    setSearchQuery("");
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const product = products.find((p) => p.id === items[index].productId);
    if (!product) return;
    const variant = items[index].variantId
      ? product.variants?.find((v) => v.id === items[index].variantId)
      : null;
    const inventory = variant?.inventory ?? product.inventory ?? 0;
    if (quantity > inventory) {
      toast({
        title: "Invalid Quantity",
        description: `Quantity cannot exceed available inventory(${inventory}) for ${product.title}${variant ? ` (${variant.name})` : ''}.`,
        variant: "destructive",
      });
      return;
    }
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], quantity: Math.max(1, quantity) };
    setItems(updatedItems);
  };

  const addOrderItem = () => {
    setItems([...items, { productId: "", quantity: 1, title: "", price: 0 }]);
  };

  const removeOrderItem = (index: number) => {
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    setItems(updatedItems);
  };

  const handleUpdateOrder = async () => {
    setIsUpdating(true);

    if (!order?.id) return;

    if (!firstName || !lastName || !email || !phone) {
      toast({
        title: "Missing Customer Information",
        description: "Please fill in all customer details",
        variant: "destructive",
      });
      return;
    }

    if (!address || !city || !postalCode || !country) {
      toast({
        title: "Missing Address Information",
        description: "Please fill in all required address details",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0 || items.some((item) => !item.productId)) {
      toast({
        title: "Invalid Order Items",
        description: "Please ensure all items have a valid product",
        variant: "destructive",
      });
      return;
    }

    if (discountError) {
      toast({
        title: "Invalid Discount",
        description: discountError,
        variant: "destructive",
      });
      return;
    }

    const payload: Partial<Order> = {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      postalCode,
      country,
      status: status || "PENDING",
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,

      })),
      subtotal,
      shippingCost,
      total,
      discountId: selectedDiscountId || null,
      shippingOptionId: selectedShippingOptionId || null,
    };

    try {
      await onUpdateOrder(order.id, payload);
      await fetchOrders();
      onOpenChange(false);
      toast({
        title: "Order Updated",
        description: `Order #${order.id} has been updated successfully`,
      });
    } catch (err) {
      console.error("[UPDATE_ORDER]", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update order",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order #{order.id}</DialogTitle>
          <DialogDescription>
            Update customer details, shipping information, products, and discount for this order
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <h3 className="text-lg font-medium">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <h3 className="text-lg font-medium">Shipping Address</h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <h3 className="text-lg font-medium">Discount</h3>
            <div className="grid gap-2">
              <Label htmlFor="discount">Discount</Label>
              <Select
                value={selectedDiscountId || "none"}
                onValueChange={(value) => {
                  setSelectedDiscountId(value === "none" ? null : value);
                  setDiscountError("");
                }}
              >
                <SelectTrigger id="discount">
                  <SelectValue placeholder="Select a discount (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Discount</SelectItem>
                  {discounts.map((discount) => (
                    <SelectItem key={discount.id} value={discount.id}>
                      {discount.code} -{" "}
                      {discount.type === "percentage"
                        ? `${discount.value}% `
                        : discount.type === "fixed_amount"
                          ? `₦${discount.value.toFixed(2)} `
                          : "Free Shipping"}{" "}
                      {discount.minSubtotal
                        ? `(Min: ₦${discount.minSubtotal.toFixed(2)})`
                        : ""}{" "}
                      {discount.products?.length || discount.variants?.length
                        ? `(${discount.products?.length || 0} products, ${discount.variants?.length || 0} variants)`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {discountError && (
                <p className="text-sm text-red-600">{discountError}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <h3 className="text-lg font-medium">Shipping Option</h3>
            <div className="grid gap-2">
              <Label htmlFor="shippingOption">Shipping Option</Label>
              <Select
                value={selectedShippingOptionId || "none"}
                onValueChange={(value) => {
                  setSelectedShippingOptionId(value === "none" ? null : value);
                  setDiscountError("");
                }}
              >
                <SelectTrigger id="shippingOption">
                  <SelectValue placeholder="Select a shipping option (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Shipping</SelectItem>
                  {shippingOptions
                    .filter((option) => option.status === "ACTIVE")
                    .map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name} - ₦{option.price.toFixed(2)} ({option.deliveryTime})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Products</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOrderItem}
              >
                <Plus className="mr-1 h-3 w-3" /> Add Product
              </Button>
            </div>
            {items.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No products in this order. Click "Add Product" to add products.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="grid gap-4 p-4 border rounded-md">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Product</Label>
                        {searchOpen === index ? (
                          <div className="relative">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="search"
                                placeholder="Search products by title, category, or tags..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                autoFocus
                              />
                            </div>
                            {searchQuery.length >= 2 && (
                              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                                {searchResults.length > 0 ? (
                                  searchResults.map((product) => (
                                    <div
                                      key={product.id}
                                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                      onClick={() => handleProductSelect(index, product)}
                                    >
                                      <div className="font-medium">{product.title}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {product.category} • {product.inventory} in stock
                                        {variantCount(product)}
                                        {product.tags?.length > 0 && (
                                          <span> • Tags: {product.tags.join(", ")}</span>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-4 py-2 text-muted-foreground">
                                    No products found matching "{searchQuery}"
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="justify-start font-normal"
                            onClick={() => setSearchOpen(index)}
                          >
                            {item.productId && item.title ? item.title : "Search products..."}
                          </Button>
                        )}
                      </div>
                      {item.productId && (
                        <div className="grid gap-2">
                          <Label>Variant</Label>
                          <Select
                            onValueChange={(value) => {
                              const product = products.find((p) => p.id === item.productId);
                              const variant = value !== "none"
                                ? product?.variants?.find((v) => v.id === value)
                                : null;
                              const updatedItems = [...items];
                              updatedItems[index] = {
                                ...updatedItems[index],
                                variantId: value !== "none" ? value : undefined,
                                title: product ? `${product.title}${variant ? ` (${variant.name})` : ''} ` : '',
                                price: variant?.price ?? product?.price ?? 0,
                              };
                              setItems(updatedItems);
                            }}
                            value={item.variantId || "none"}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a variant" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Variant</SelectItem>
                              {products
                                .find((p) => p.id === item.productId)
                                ?.variants?.filter((v) => v.inventory > 0)
                                .map((variant) => (
                                  <SelectItem key={variant.id} value={variant.id}>
                                    {variant.name} - ₦{variant.price?.toFixed(2)} ({variant.inventory} in stock)
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                      />
                    </div>
                    {item.productId && item.price && (
                      <div className="text-sm text-muted-foreground">
                        {item.quantity} × {item.title} at ₦{item.price.toFixed(2)} = ₦{(item.price * item.quantity).toFixed(2)}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeOrderItem(index)}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end gap-4 text-sm font-medium">
                  <div>Subtotal: ₦{subtotal.toFixed(2)}</div>
                  {shippingCost > 0 && <div>Shipping: ₦{shippingCost.toFixed(2)}</div>}
                  {discountAmount > 0 && <div>Discount: ₦{discountAmount.toFixed(2)}</div>}
                  <div>Total: ₦{total.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleUpdateOrder}
            disabled={isUpdating || !!discountError || items.length === 0 || items.some((item) => !item.productId)}
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Order"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function variantCount(product: { variants?: { inventory: number }[] }) {
  if (!product.variants || product.variants.length === 0) return "";
  const count = product.variants.filter((v) => v.inventory > 0).length;
  return count > 0 ? `, ${count} variant${count > 1 ? 's' : ''} ` : "";
}
