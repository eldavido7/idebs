"use client";

import { useState, useEffect, useRef } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Plus, Minus, ShoppingCart, User, LogOut } from "lucide-react";
import { useStore, useAuthStore } from "@/store/store";
import { useShallow } from "zustand/react/shallow";

interface CartItem {
    productId: string;
    variantId?: string;
    quantity: number;
}

export default function CashierCheckout() {
    const { user, logout } = useAuthStore();
    const { products, discounts, addOrder, fetchProducts, fetchDiscounts } = useStore(
        useShallow((state) => ({
            products: state.products,
            discounts: state.discounts,
            addOrder: state.addOrder,
            fetchProducts: state.fetchProducts,
            fetchDiscounts: state.fetchDiscounts,
        }))
    );

    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedDiscountId, setSelectedDiscountId] = useState<string>("none");
    const [subtotal, setSubtotal] = useState(0);
    const [total, setTotal] = useState(0);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [discountError, setDiscountError] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false); // New state for modal
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [receiptCart, setReceiptCart] = useState<CartItem[]>([]); // Add this line
    const [receiptTotals, setReceiptTotals] = useState({ subtotal: 0, discountAmount: 0, total: 0 });

    useEffect(() => {
        const loadData = async () => {
            try {
                await Promise.all([
                    !products.length && fetchProducts(),
                    !discounts.length && fetchDiscounts(),
                ]);
            } catch (error) {
                console.error("[LOAD_DATA]", error);
                toast({
                    title: "Error",
                    description: "Failed to load data",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // Filter products by name or barcode - only show when searching
    const filteredProducts = showSearchResults
        ? products.filter(
            (product) =>
                (product.inventory ?? 0) > 0 ||
                product.variants?.some((v) => v.inventory > 0)
        ).filter(
            (product) =>
                product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : [];

    // Handle search and add to cart on Enter
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && searchTerm.trim()) {
            setShowSearchResults(true);
            if (filteredProducts.length === 1) {
                addToCart(filteredProducts[0].id);
                setSearchTerm("");
                setShowSearchResults(false);
                if (searchInputRef.current) searchInputRef.current.blur();
            }
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setShowSearchResults(e.target.value.trim().length > 0);
    };

    const addToCart = (productId: string, variantId?: string) => {
        const existingItem = cart.find(
            (item) => item.productId === productId && item.variantId === variantId
        );

        if (existingItem) {
            updateCartQuantity(productId, variantId, existingItem.quantity + 1);
        } else {
            setCart([...cart, { productId, variantId, quantity: 1 }]);
        }
    };

    const updateCartQuantity = (productId: string, variantId: string | undefined, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId, variantId);
            return;
        }

        const product = products.find((p) => p.id === productId);
        if (!product) return;

        const variant = variantId ? product.variants?.find((v) => v.id === variantId) : null;
        const maxInventory = variant?.inventory ?? product.inventory ?? 0;

        if (quantity > maxInventory) {
            toast({
                title: "Insufficient Stock",
                description: `Only ${maxInventory} items available`,
                variant: "destructive",
            });
            return;
        }

        setCart(cart.map(item =>
            item.productId === productId && item.variantId === variantId
                ? { ...item, quantity }
                : item
        ));
    };

    const removeFromCart = (productId: string, variantId?: string) => {
        setCart(cart.filter(
            (item) => !(item.productId === productId && item.variantId === variantId)
        ));
    };

    const calculateTotals = () => {
        let calculatedSubtotal = 0;
        let calculatedTotal = 0;
        let calculatedDiscountAmount = 0;
        let error = "";

        try {
            for (const item of cart) {
                const product = products.find((p) => p.id === item.productId);
                if (!product) continue;

                const variant = item.variantId
                    ? product.variants?.find((v) => v.id === item.variantId)
                    : null;
                const price = variant?.price ?? product.price ?? 0;
                calculatedSubtotal += price * item.quantity;
            }

            calculatedTotal = calculatedSubtotal;

            if (selectedDiscountId !== "none") {
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
                    error = `Order subtotal (₦${calculatedSubtotal.toFixed(2)}) is below minimum (₦${discount.minSubtotal.toFixed(2)})`;
                } else if (discount.products?.length || discount.variants?.length) {
                    const isApplicable = cart.some((item) =>
                        discount.products?.some((p) => p.id === item.productId) ||
                        discount.variants?.some((v) => v.id === item.variantId)
                    );
                    if (!isApplicable) {
                        error = `Selected products do not qualify for discount ${discount.code}`;
                    }
                }

                if (!error && discount) {
                    if (discount.type === "percentage") {
                        calculatedDiscountAmount = (discount.value / 100) * calculatedSubtotal;
                    } else if (discount.type === "fixed_amount") {
                        calculatedDiscountAmount = Math.min(discount.value, calculatedSubtotal);
                    }
                    calculatedTotal = Math.max(0, calculatedSubtotal - calculatedDiscountAmount);
                }
            }

            setSubtotal(calculatedSubtotal);
            setTotal(calculatedTotal);
            setDiscountAmount(calculatedDiscountAmount);
            setDiscountError(error);
        } catch (err) {
            setDiscountError("Failed to calculate totals");
            console.error("[CALCULATE_TOTALS]", err);
        }
    };

    useEffect(() => {
        calculateTotals();
    }, [cart, selectedDiscountId, products, discounts]);

    const processCheckout = async () => {
        if (cart.length === 0) {
            toast({
                title: "Empty Cart",
                description: "Please add items to cart before checkout",
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

        setIsProcessing(true);

        try {
            const orderData = {
                cashierId: user?.id,
                status: "DELIVERED" as const,
                items: cart.map((item) => ({
                    productId: item.productId,
                    variantId: item.variantId || null,
                    quantity: item.quantity,
                })),
                discountId: selectedDiscountId !== "none" ? selectedDiscountId : null,
                subtotal,
                total,
                shippingCost: 0,
            };

            await addOrder(orderData);

            // Store cart and totals for receipt BEFORE clearing
            setReceiptCart([...cart]); // Copy current cart
            setReceiptTotals({ subtotal, discountAmount, total }); // Store current totals

            // Show receipt modal first
            setShowReceiptModal(true);

            // Then clear the cart for new orders
            setCart([]);
            setSelectedDiscountId("none");

            toast({
                title: "Checkout Complete",
                description: `Order processed successfully. Total: ₦${total.toFixed(2)}`,
            });
        } catch (error) {
            console.error("[CHECKOUT_ERROR]", error);
            toast({
                title: "Checkout Failed",
                description: error instanceof Error ? error.message : "Failed to process checkout",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle print receipt
    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
        );
    }

    const availableProducts = products.filter(
        (product) => (product.inventory ?? 0) > 0 || product.variants?.some((v) => v.inventory > 0)
    );

    return (
        <div className="min-h-screen bg-white p-4">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <ShoppingCart className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Checkout Terminal</h1>
                        <p className="text-muted-foreground">Process in-store purchases</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Product Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle>Select Products</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
                        <div className="mb-4">
                            <Input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search by name or barcode"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                onKeyDown={handleSearchKeyDown}
                                className="w-full"
                            />
                        </div>
                        {filteredProducts.length === 0 && showSearchResults ? (
                            <p className="text-center text-muted-foreground py-8">
                                No products found
                            </p>
                        ) : filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="border rounded-lg p-4 space-y-2 flex items-center justify-between cursor-pointer hover:bg-white"
                                    onClick={() => {
                                        addToCart(product.id);
                                        setSearchTerm("");
                                        setShowSearchResults(false);
                                    }}
                                >
                                    <div>
                                        <h3 className="font-medium">{product.title}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            ₦{product.price?.toFixed(2)} • {product.inventory} in stock
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addToCart(product.id);
                                            setSearchTerm("");
                                            setShowSearchResults(false);
                                        }}
                                        disabled={!product.inventory || product.inventory <= 0}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                Start typing to search for products
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Cart and Checkout */}
                <div className="space-y-6">
                    {/* Cart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Cart ({cart.length} items)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 max-h-[300px] overflow-y-auto">
                            {cart.length === 0 ? (
                                <p className="text-center text-muted-foreground py-4">Cart is empty</p>
                            ) : (
                                cart.map((item, index) => {
                                    const product = products.find((p) => p.id === item.productId);
                                    const variant = item.variantId
                                        ? product?.variants?.find((v) => v.id === item.variantId)
                                        : null;
                                    const price = variant?.price ?? product?.price ?? 0;
                                    const itemTotal = price * item.quantity;

                                    return (
                                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-sm">
                                                    {product?.title}
                                                    {variant && <span className="text-muted-foreground"> ({variant.name})</span>}
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    ₦{price.toFixed(2)} × {item.quantity} = ₦{itemTotal.toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateCartQuantity(item.productId, item.variantId, item.quantity - 1)}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-8 text-center text-sm">{item.quantity}</span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateCartQuantity(item.productId, item.variantId, item.quantity + 1)}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => removeFromCart(item.productId, item.variantId)}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>

                    {/* Discount Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Apply Discount</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Select value={selectedDiscountId} onValueChange={setSelectedDiscountId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select discount (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Discount</SelectItem>
                                        {discounts
                                            .filter((discount) => discount.isActive)
                                            .map((discount) => (
                                                <SelectItem key={discount.id} value={discount.id}>
                                                    {discount.code} -{" "}
                                                    {discount.type === "percentage"
                                                        ? `${discount.value}%`
                                                        : `₦${discount.value.toFixed(2)}`}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                {discountError && (
                                    <p className="text-sm text-red-600">{discountError}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Order Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>₦{subtotal.toFixed(2)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Discount:</span>
                                    <span>-₦{discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg border-t pt-2">
                                <span>Total:</span>
                                <span>₦{total.toFixed(2)}</span>
                            </div>
                            <Button
                                className="w-full mt-4"
                                size="lg"
                                onClick={processCheckout}
                                disabled={isProcessing || cart.length === 0 || !!discountError}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    "Process Checkout"
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Receipt Modal */}
            {showReceiptModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md print:bg-white print:shadow-none">
                        <div className="print-only">
                            <h2 className="text-2xl font-bold text-center mb-4">IDEBS</h2>
                            <h3 className="text-lg font-semibold mb-4">Receipt</h3>

                            {/* Receipt details */}
                            <div className="mb-4">
                                <div className="text-sm text-muted-foreground mb-2">
                                    Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                                </div>

                                {/* Cart items - use receiptCart instead of cart */}
                                {receiptCart.length > 0 ? (
                                    receiptCart.map((item, index) => {
                                        const product = products.find((p) => p.id === item.productId);
                                        const variant = item.variantId
                                            ? product?.variants?.find((v) => v.id === item.variantId)
                                            : null;
                                        const price = variant?.price ?? product?.price ?? 0;
                                        const itemTotal = price * item.quantity;

                                        return (
                                            <div key={index} className="flex justify-between mb-2 text-sm">
                                                <span className="flex-1">
                                                    {product?.title || "Unknown Product"}
                                                    {variant && ` (${variant.name})`} × {item.quantity}
                                                </span>
                                                <span className="ml-4 font-medium">₦{itemTotal.toFixed(2)}</span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center text-muted-foreground py-4">
                                        No items in cart
                                    </div>
                                )}
                            </div>

                            {/* Totals - use receiptTotals instead of the current state values */}
                            {receiptCart.length > 0 && (
                                <>
                                    <div className="flex justify-between text-sm border-t pt-2">
                                        <span>Subtotal:</span>
                                        <span>₦{receiptTotals.subtotal.toFixed(2)}</span>
                                    </div>
                                    {receiptTotals.discountAmount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span>Discount:</span>
                                            <span className="text-green-600">-₦{receiptTotals.discountAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold border-t pt-2">
                                        <span>Total:</span>
                                        <span>₦{receiptTotals.total.toFixed(2)}</span>
                                    </div>
                                </>
                            )}

                            <p className="text-center mt-6 text-sm text-muted-foreground">
                                Thank you for shopping with IDEBS!
                            </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end gap-4 mt-6 print:hidden">
                            <Button variant="outline" onClick={() => setShowReceiptModal(false)}>
                                Close
                            </Button>
                            <Button onClick={handlePrint}>Print Receipt</Button>
                        </div>
                    </div>
                </div>
            )}
            <style jsx>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-only,
                    .print-only * {
                        visibility: visible;
                    }
                    .print-only {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}