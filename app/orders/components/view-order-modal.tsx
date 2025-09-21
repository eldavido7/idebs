"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import type { Order } from "@/types";
import { useSettingsStore } from "@/store/store";
import { Button } from "@/components/ui/button";

interface ViewOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onUpdateStatus: (orderId: string, status: string) => void;
}

export function ViewOrderModal({
  open,
  onOpenChange,
  order,
  onUpdateStatus,
}: ViewOrderModalProps) {
  if (!order) return null;

  const [loading, setLoading] = useState(true);

  const { shippingOptions } = useSettingsStore();

  const selectedShippingOption = shippingOptions.find(
    (option) => option.id === order.shippingOptionId
  );

  useEffect(() => {
    if (!shippingOptions.length && order.shippingOptionId) {
      useSettingsStore
        .getState()
        .fetchSettings()
        .then(() => {
          console.log("[FETCHED_SHIPPING_OPTIONS]", useSettingsStore.getState().shippingOptions);
          setLoading(false);
        })
        .catch((error) => {
          console.error("[FETCH_SETTINGS_ERROR]", error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [order.shippingOptionId]); // Depend on order.shippingOptionId

  const originalTotal = order.items.reduce(
    (sum, item) => sum + item.subtotal,
    0
  );

  let discountedTotal = originalTotal;

  if (order.discount) {
    if (order.discount.type === "percentage") {
      discountedTotal = originalTotal * (1 - order.discount.value / 100);
    } else if (order.discount.type === "fixed_amount") {
      discountedTotal = Math.max(0, originalTotal - order.discount.value);
    }
  }

  const [selectedStatus, setSelectedStatus] = useState<string>(
    order.status ?? "PENDING"
  );

  // Update local state whenever a new order is loaded
  useEffect(() => {
    setSelectedStatus(order.status ?? "PENDING");
  }, [order]);

  const [statusToUpdate, setStatusToUpdate] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>
            Order #{order.id} placed on{" "}
            {format(new Date(order.createdAt), "MMMM dd, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Order Details</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Items</h3>
              <Select
                value={selectedStatus}
                onValueChange={(value) => {
                  if (value !== selectedStatus) {
                    setStatusToUpdate(value); // Store the intended new status
                    setIsConfirmModalOpen(true); // Open the confirmation modal
                  }
                }}
                disabled={selectedStatus === "DELIVERED"}
              >
                <SelectTrigger
                  className="w-[180px]"
                  disabled={selectedStatus === "DELIVERED"}
                >
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELED">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product.title}
                        {item.variantId && item.variant ? ` (${item.variant.name})` : ''}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        ₦{(item.subtotal).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Card className="w-[300px]">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {order.discount && (
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Discount ({order.discount.code})</span>
                      <span>
                        {order.discount.type === "percentage"
                          ? `${order.discount.value}%`
                          : `₦{(order.discount.value).toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  {order.shippingCost ? (
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Shipping</span>
                      <span>₦{(order.shippingCost).toFixed(2)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total</span>
                    <span>
                      {order.discount ? (
                        <>
                          <span className="line-through text-gray-500 mr-2">
                            ₦{(originalTotal).toFixed(2)}
                          </span>
                          <span className="text-green-600 font-semibold">
                            ₦{(discountedTotal).toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <>₦{(originalTotal).toFixed(2)}</>
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium">Contact Details</h4>
                  <div className="text-sm mt-1">
                    <p>
                      {order.firstName} {order.lastName}
                    </p>
                    <p>{order.email}</p>
                    <p>{order.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p>
                    {order.address}, {order.city}, {order.state}{" "}
                    {order.postalCode}
                  </p>
                  <p>{order.country}</p>
                </div>
                <div className="text-sm mt-4">
                  <h4 className="font-medium">Shipping Option</h4>
                  {order.shippingOptionId && selectedShippingOption ? (
                    <p>
                      {selectedShippingOption.name} (₦{(selectedShippingOption.price).toFixed(2)} - {selectedShippingOption.deliveryTime})
                    </p>
                  ) : (
                    <p>No shipping option selected</p>
                  )}
                  <h4 className="font-medium mt-2">Payment Reference</h4>
                  <p>{order.paymentReference || "N/A"}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirm Status Update</DialogTitle>
              <DialogDescription>
                Are you sure you want to update the status to <strong>{statusToUpdate}</strong>?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setStatusToUpdate(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setSelectedStatus(statusToUpdate!);
                  onUpdateStatus(order.id, statusToUpdate!);
                  setIsConfirmModalOpen(false);
                  setStatusToUpdate(null);
                }}
              >
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
