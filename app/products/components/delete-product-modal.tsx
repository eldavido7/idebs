"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import type { Product, Order } from "@/types";

interface DeleteProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  orders: Order[];
  onDeleteProduct: (id: string) => void;
}

export function DeleteProductModal({
  open,
  onOpenChange,
  product,
  orders,
  onDeleteProduct,
}: DeleteProductModalProps) {
  const [loading, setLoading] = useState(false);

  const confirmDeleteProduct = async () => {
    if (!product) return;
    setLoading(true);

    // Check if product is used in any orders
    const productInOrders = orders.some((order) =>
      order.items.some(
        (item) => item.productId === product.id || item.variantId === product.id
      )
    );

    if (productInOrders) {
      toast({
        title: "Cannot Delete Product",
        description: "This product is used in orders and cannot be deleted.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete product");

      onDeleteProduct(product.id);
      toast({
        title: "Product Deleted",
        description: `${product.title} has been deleted.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "There was a problem deleting the product.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Confirm Deletion
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this product? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        {/* Extra warning if product has variants */}
        {product?.variants?.length && product.variants.length > 0 && (
          <div className="mt-4 text-sm text-red-700 bg-red-50 p-2 rounded-md dark:bg-white dark:text-red-800">
            ⚠️ This product has {product?.variants?.length} variant
            {product?.variants?.length && product.variants.length > 1 ? "s" : ""}. Deleting it will remove
            all variants as well.
          </div>
        )}

        <DialogFooter className="mt-4 flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDeleteProduct}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
