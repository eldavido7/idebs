"use client";

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Minus, Plus } from "lucide-react";
import type { Order } from "@/types";
import { useSettingsStore, useStore } from "@/store/store";
import { useShallow } from "zustand/react/shallow";

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddOrder: (
    order: Omit<Order, "id" | "createdAt" | "updatedAt"> & {
      items: { productId: string; quantity: number; variantId?: string }[];
    }
  ) => Promise<void>;
}

export function CreateOrderModal({
  open,
  onOpenChange,
  onAddOrder,
}: CreateOrderModalProps) {
  const { products, discounts, fetchProducts, fetchDiscounts, fetchOrders } =
    useStore(
      useShallow((state) => ({
        products: state.products,
        discounts: state.discounts,
        fetchProducts: state.fetchProducts,
        fetchDiscounts: state.fetchDiscounts,
        fetchOrders: state.fetchOrders,
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
  const [selectedItems, setSelectedItems] = useState<
    { productId: string; quantity: number; variantId?: string }[]
  >([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("none");
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState<string>("none");
  const [discountError, setDiscountError] = useState<string>("");
  const [subtotal, setSubtotal] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [total, setTotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<typeof products>([]);

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

  // Filter products based on search
  useEffect(() => {
    if (productSearch.length < 2) {
      setFilteredProducts([]);
      return;
    }

    const filtered = products.filter(
      (p) =>
        p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.id.toLowerCase().includes(productSearch.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [productSearch, products]);

  const addItemToOrder = () => {
    setSelectedItems([...selectedItems, { productId: "", quantity: 1 }]);
  };

  const removeItemFromOrder = (index: number) => {
    const newItems = [...selectedItems];
    newItems.splice(index, 1);
    setSelectedItems(newItems);
  };

  const updateOrderItem = (
    index: number,
    field: keyof typeof selectedItems[number],
    value: string | number
  ) => {
    const newItems = [...selectedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "productId") {
      newItems[index].variantId = undefined; // Reset variant when product changes
    }
    setSelectedItems(newItems);
  };

  const calculateTotals = () => {
    let calculatedSubtotal = 0;
    let calculatedTotal = 0;
    let calculatedShippingCost = 0;
    let calculatedDiscountAmount = 0;
    let error = "";

    try {
      for (const item of selectedItems) {
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
          error = `${product.title}${variant ? ` (${variant.name})` : ''} is out of stock.`;
          break;
        }
        calculatedSubtotal += price * item.quantity;
      }

      calculatedTotal = calculatedSubtotal;

      if (selectedShippingOptionId !== "none") {
        const shippingOption = shippingOptions.find((s) => s.id === selectedShippingOptionId);
        if (!shippingOption || shippingOption.status !== "ACTIVE") {
          error = "Selected shipping option is invalid or inactive.";
        } else {
          calculatedShippingCost = shippingOption.price;
          calculatedTotal += calculatedShippingCost;
        }
      }

      if (selectedDiscountId !== "none" && !error) {
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
          const isApplicable = selectedItems.some((item) =>
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
  }, [selectedItems, selectedDiscountId, selectedShippingOptionId, products, discounts, shippingOptions]);

  const handleCreateOrder = async () => {
    setIsCreating(true);

    if (!firstName || !lastName || !email || !phone) {
      toast({
        title: "Missing Customer Information",
        description: "Please fill in all customer details",
        variant: "destructive",
      });
      setIsCreating(false);
      return;
    }

    if (!address || !city || !state || !postalCode || !country) {
      toast({
        title: "Missing Shipping Information",
        description: "Please fill in all shipping address details",
        variant: "destructive",
      });
      setIsCreating(false);
      return;
    }

    if (
      selectedItems.length === 0 ||
      selectedItems.some((item) => !item.productId || item.quantity <= 0)
    ) {
      toast({
        title: "Invalid Order Items",
        description: "Please add at least one valid product with a quantity greater than 0",
        variant: "destructive",
      });
      setIsCreating(false);
      return;
    }

    if (discountError) {
      toast({
        title: "Invalid Discount",
        description: discountError,
        variant: "destructive",
      });
      setIsCreating(false);
      return;
    }

    const orderData = {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      postalCode,
      country,
      status: "PENDING" as Order["status"],
      items: selectedItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
      })),
      discountId: selectedDiscountId !== "none" ? selectedDiscountId : null,
      shippingOptionId: selectedShippingOptionId !== "none" ? selectedShippingOptionId : null,
      shippingCost: selectedShippingOptionId !== "none" ? shippingCost : 0,
      subtotal,
      total,
    };

    try {
      await onAddOrder(orderData);
      await fetchOrders();
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setCity("");
      setState("");
      setPostalCode("");
      setCountry("Nigeria");
      setSelectedItems([]);
      setSelectedDiscountId("none");
      setSelectedShippingOptionId("none");
      setDiscountError("");
      setSubtotal(0);
      setShippingCost(0);
      setTotal(0);
      setDiscountAmount(0);
      onOpenChange(false);
      toast({
        title: "Order Created",
        description: "Order has been created successfully",
      });
    } catch (error) {
      console.error("[CREATE_ORDER]", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create order.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Create a new order by entering customer details, selecting products, and applying a discount if applicable
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
                    required
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
                value={selectedDiscountId}
                onValueChange={(value) => {
                  setSelectedDiscountId(value);
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
                value={selectedShippingOptionId}
                onValueChange={(value) => {
                  setSelectedShippingOptionId(value);
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
                onClick={addItemToOrder}
              >
                <Plus className="mr-1 h-3 w-3" /> Add Product
              </Button>
            </div>

            {selectedItems.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No products added. Click "Add Product" to add products to this order.
              </div>
            ) : (
              <div className="space-y-4">
                {selectedItems.map((item, index) => (
                  <div key={index} className="grid gap-4 p-4 border rounded-md">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Product</Label>
                        {products.length > 0 ? (
                          <div className="space-y-2">
                            <Input
                              placeholder="Search by product name or ID"
                              value={item.productId ?
                                products.find(p => p.id === item.productId)?.title || item.productId
                                : productSearch
                              }
                              onChange={(e) => {
                                if (!item.productId) {
                                  setProductSearch(e.target.value);
                                }
                              }}
                              onFocus={() => {
                                if (!item.productId) {
                                  setProductSearch("");
                                }
                              }}
                            />
                            {!item.productId && filteredProducts.length > 0 && (
                              <div className="border rounded p-2 max-h-[150px] overflow-y-auto space-y-1">
                                {filteredProducts
                                  .filter((product) => (product.inventory ?? 0) > 0 || product.variants?.some((v) => v.inventory > 0))
                                  .map((product) => (
                                    <div
                                      key={product.id}
                                      className="cursor-pointer hover:bg-muted p-2 rounded text-sm"
                                      onClick={() => {
                                        updateOrderItem(index, "productId", product.id);
                                        setProductSearch("");
                                        setFilteredProducts([]);
                                      }}
                                    >
                                      <div className="font-medium">{product.title}</div>
                                      <div className="text-xs text-muted-foreground">
                                        ₦{product.price?.toFixed(2)} • {product.inventory} in stock{variantCount(product)}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No products available. Please add products to the inventory first.
                          </div>
                        )}
                      </div>
                      {item.productId && (
                        <div className="grid gap-2">
                          <Label>Variant</Label>
                          <Select
                            onValueChange={(value) => updateOrderItem(index, "variantId", value === "none" ? undefined : value)}
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

                    <div className="flex items-end gap-4">
                      <div className="grid gap-2 flex-1">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const quantity = Number.parseInt(e.target.value) || 1;
                            const product = products.find((p) => p.id === item.productId);
                            if (product) {
                              const variant = item.variantId
                                ? product.variants?.find((v) => v.id === item.variantId)
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
                            }
                            updateOrderItem(index, "quantity", quantity);
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeItemFromOrder(index)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>

                    {item.productId && (
                      <div className="text-sm text-muted-foreground">
                        {(() => {
                          const product = products.find((p) => p.id === item.productId);
                          if (!product) return "Product not found";
                          const variant = item.variantId
                            ? product.variants?.find((v) => v.id === item.variantId)
                            : null;
                          const price = variant?.price ?? product.price ?? 0;
                          const total = price * item.quantity;
                          return `${item.quantity} × ${product.title}${variant ? ` (${variant.name})` : ''} at ₦${price.toFixed(2)} = ₦${total.toFixed(2)} `;
                        })()}
                      </div>
                    )}
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
            onClick={handleCreateOrder}
            disabled={isCreating || !!discountError || selectedItems.length === 0 || selectedItems.some((item) => !item.productId)}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Order"
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
  return count > 0 ? `, ${count} variant${count > 1 ? 's' : ''}` : "";
}