"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useStore } from "@/store/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { CreateOrderModal } from "./components/create-order-modal";
import { ViewOrderModal } from "./components/view-order-modal";
import { EditOrderModal } from "./components/edit-order-modal";
import {
  ChevronDown,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import type { Order } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersPage() {
  const { orders, addOrder, updateOrder, fetchProducts, fetchOrders } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [editOrderOpen, setEditOrderOpen] = useState(false);
  const [viewOrderOpen, setViewOrderOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter orders based on search query and status filter
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        searchQuery === "" ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${order.firstName} ${order.lastName}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        order.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === null || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    if (!orders || orders.length === 0) {
      fetchOrders()
        .then(() => {
          console.log("[FETCHED_ORDERS]", useStore.getState().orders);
          setLoading(false);
        })
        .catch((error) => {
          console.error("[FETCH_ORDERS_ERROR]", error);
          toast({
            title: "Error",
            description: "Failed to fetch orders.",
            variant: "destructive",
          });
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []); // Empty dependencies for one-time fetch

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[200px] mb-2" />
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-10 w-full" />
            </div>

            <Skeleton className="h-24 w-full" />

            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-10 w-full" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-10 w-full" />
            </div>

            <div className="flex justify-end space-x-2">
              <Skeleton className="h-10 w-[100px]" />
              <Skeleton className="h-10 w-[150px]" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle view order
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setViewOrderOpen(true);
  };

  // Handle edit order
  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setEditOrderOpen(true);
  };

  // Handle update order status
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const orderToUpdate = orders.find((o) => o.id === orderId);
    if (!orderToUpdate) return;

    try {
      // Validate inventory for SHIPPED/DELIVERED statuses
      if (newStatus === "SHIPPED" || newStatus === "DELIVERED") {
        const products = useStore.getState().products;
        for (const item of orderToUpdate.items) {
          const product = products.find((p) => p.id === item.productId);
          if (!product) throw new Error(`Product ${item.productId} not found`);

          const availableInventory = item.variantId
            ? product.variants?.find((v) => v.id === item.variantId)?.inventory ?? 0
            : product.inventory ?? 0;

          if (availableInventory < item.quantity) {
            // Improved error message that shows variant name if applicable
            const itemName = item.variantId && item.variant
              ? `${product.title} (${item.variant.name})`
              : product.title;
            throw new Error(
              `${itemName} is out of stock. Available: ${availableInventory}, Required: ${item.quantity}`
            );
          }
        }
      }

      // Recalculate subtotal and total
      const products = useStore.getState().products;
      const itemsWithSubtotal = orderToUpdate.items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found`);
        const variant = item.variantId
          ? product.variants?.find((v) => v.id === item.variantId) || null
          : null;
        const price = variant?.price ?? product.price ?? 0;
        return {
          ...item,
          subtotal: price * item.quantity,
          product,
          variant,
        };
      });

      const subtotal = itemsWithSubtotal.reduce((sum, item) => sum + item.subtotal, 0);
      let total = subtotal + (orderToUpdate.shippingCost ?? 0);
      let shippingCost = orderToUpdate.shippingCost ?? 0;
      const discount = orderToUpdate.discountId
        ? useStore.getState().discounts.find((d) => d.id === orderToUpdate.discountId) ?? null
        : null;

      if (discount) {
        if (
          !discount.isActive ||
          (discount.usageLimit && discount.usageCount >= discount.usageLimit) ||
          (discount.startsAt && new Date() < new Date(discount.startsAt)) ||
          (discount.endsAt && new Date() > new Date(discount.endsAt)) ||
          (discount.minSubtotal && subtotal < discount.minSubtotal) ||
          (discount.products?.length && !itemsWithSubtotal.some((item) =>
            discount.products?.some((p) => p.id === item.productId)
          )) ||
          (discount.variants?.length && !itemsWithSubtotal.some((item) =>
            discount.variants?.some((v) => v.id === item.variantId)
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
      }

      await updateOrder(orderId, {
        status: newStatus as Order["status"],
        firstName: orderToUpdate.firstName,
        lastName: orderToUpdate.lastName,
        email: orderToUpdate.email,
        phone: orderToUpdate.phone,
        address: orderToUpdate.address,
        city: orderToUpdate.city,
        state: orderToUpdate.state,
        postalCode: orderToUpdate.postalCode,
        country: orderToUpdate.country,
        subtotal,
        total,
        shippingCost,
        discountId: orderToUpdate.discountId ?? null,
        items: itemsWithSubtotal,
        shippingOptionId: orderToUpdate.shippingOptionId,
        paymentReference: orderToUpdate.paymentReference ?? null,
      });

      // Send email notification
      try {
        const emailRes = await fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: orderToUpdate.email,
            firstName: orderToUpdate.firstName,
            lastName: orderToUpdate.lastName,
            orderId,
            status: newStatus,
            orderDetails: {
              items: itemsWithSubtotal.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                subtotal: item.subtotal,
                product: {
                  title: item.product.title,
                  price: item.variant?.price ?? item.product.price ?? 0,
                  imageUrl: item.product.imageUrl,
                },
                variant: item.variant ? { name: item.variant.name } : null,
              })),
              discount,
              address: orderToUpdate.address,
              city: orderToUpdate.city,
              state: orderToUpdate.state,
              postalCode: orderToUpdate.postalCode,
              country: orderToUpdate.country,
              shippingCost,
              subtotal,
            },
          }),
        });
        if (!emailRes.ok) {
          const errorData = await emailRes.json().catch(() => ({}));
          console.error("Failed to send email:", errorData);
          toast({
            variant: "destructive",
            title: "Email Error",
            description: `Failed to send email notification: ${errorData.error || 'Unknown error'}`,
          });
        } else {
          console.log("Email sent successfully for order:", orderId);
        }
      } catch (emailError) {
        console.error("Email sending error:", emailError);
        toast({
          variant: "destructive",
          title: "Email Error",
          description: "Failed to send email notification.",
        });
      }

      toast({
        title: "Order Status Updated",
        description: `Order #${orderId} status updated to ${newStatus}`,
      });
    } catch (err) {
      console.error("[UPDATE_ORDER]", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update order status.",
      });
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500";
      case "PROCESSING":
        return "bg-blue-500";
      case "SHIPPED":
        return "bg-purple-500";
      case "DELIVERED":
        return "bg-green-500";
      case "CANCELLED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Manage and track customer orders
          </p>
        </div>
        <Button onClick={() => setCreateOrderOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Order
        </Button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">No orders found</h3>
          <p className="text-muted-foreground">
            Create some and they'll appear here
          </p>
        </div>
      ) : (
        <>
          <Card className="border-0 md:border md:p-4">
            <div className="md:flex flex-1 items-center justify-between mb-4">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Customer name or order ID..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="mt-4 md:mt-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      {statusFilter
                        ? `Status: ${statusFilter}`
                        : "Filter by Status"}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                      All Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("PENDING")}>
                      Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("PROCESSING")}>
                      Processing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("SHIPPED")}>
                      Shipped
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("DELIVERED")}>
                      Delivered
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("CANCELLED")}>
                      Cancelled
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="rounded-md border md:max-w-full max-w-[380px]">
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="hidden md:table-cell text-left">
                        Order ID
                      </TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead className="table-cell">Customer</TableHead>
                      <TableHead className="hidden md:table-cell text-center">
                        Status
                      </TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="md:text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>

                    {paginatedOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium hidden md:table-cell text-left">
                          {order.id}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(order.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="md:w-auto w-[100px] break-all break-words">
                          {`${order.firstName} ${order.lastName}`}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="md:w-auto w-[100px] break-words">
                          <div>
                            <div>₦{(order.total).toFixed(2)}</div>
                            {order.discount && (
                              <span className="text-xs text-muted-foreground italic">
                                Discount Applied ({order.discount.code})
                              </span>
                            )}
                            {order.items.some((item) => item.variantId) && (
                              <span className="text-xs text-muted-foreground">
                                Includes variants
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="md:w-auto w-[50px]">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleViewOrder(order)}
                              >
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleEditOrder(order)}
                                disabled={order.status === "DELIVERED"}
                              >
                                Edit Order
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}

                  </TableBody>
                </Table>
              </div>
            </div>
            <CardFooter className="md:flex grid justify-between pt-8">
              <div className="text-sm text-muted-foreground">
                Showing {paginatedOrders.length} of {filteredOrders.length} orders
              </div>
              <div className="flex justify-between items-center md:mt-0 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="mx-2">
                  Page {currentPage} of {Math.ceil(filteredOrders.length / itemsPerPage)}
                </span>
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(prev + 1, Math.ceil(filteredOrders.length / itemsPerPage))
                    )
                  }
                  disabled={currentPage === Math.ceil(filteredOrders.length / itemsPerPage)}
                >
                  Next
                </Button>
              </div>
            </CardFooter>
          </Card>
        </>
      )}

      {/* Create Order Modal */}
      <CreateOrderModal
        open={createOrderOpen}
        onOpenChange={setCreateOrderOpen}
        onAddOrder={addOrder}
      />

      {/* Edit Order Modal */}
      {selectedOrder && (
        <EditOrderModal
          open={editOrderOpen}
          onOpenChange={setEditOrderOpen}
          order={selectedOrder}
          onUpdateOrder={updateOrder}
        />
      )}

      {/* View Order Modal */}
      {selectedOrder && (
        <ViewOrderModal
          open={viewOrderOpen}
          onOpenChange={setViewOrderOpen}
          order={selectedOrder}
          onUpdateStatus={(orderId, status) =>
            handleUpdateStatus(orderId, status)
          }
        />
      )}
    </div>
  );
}
