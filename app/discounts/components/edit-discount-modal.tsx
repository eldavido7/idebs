"use client";

import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import type { Discount } from "@/types";

interface EditDiscountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount: Discount | null;
  onUpdateDiscount: (updated: Partial<Discount>, id: string) => void;
}

export function EditDiscountModal({
  open,
  onOpenChange,
  discount,
  onUpdateDiscount,
}: EditDiscountModalProps) {
  const { products } = useStore();
  const [productSearch, setProductSearch] = useState("");
  const [variantSearch, setVariantSearch] = useState("");
  const [isUpdating, setisUpdating] = useState(false);

  // Local state that matches the discount structure
  const [editData, setEditData] = useState({
    code: "",
    description: "",
    type: "percentage" as "percentage" | "fixed_amount" | "free_shipping",
    value: 0,
    usageLimit: undefined as number | undefined,
    startsAt: new Date(),
    endsAt: undefined as Date | undefined,
    isActive: true,
    minSubtotal: undefined as number | undefined,
    productIds: [] as string[],
    variantIds: [] as string[],
  });

  // Initialize form data when discount changes
  useEffect(() => {
    if (discount) {
      setEditData({
        code: discount.code,
        description: discount.description || "",
        type: discount.type,
        value: discount.value,
        usageLimit: discount.usageLimit || undefined,
        startsAt: new Date(discount.startsAt),
        endsAt: discount.endsAt ? new Date(discount.endsAt) : undefined,
        isActive: discount.isActive,
        minSubtotal: discount.minSubtotal || undefined,
        productIds: discount.products?.map((p) => p.id) || [],
        variantIds: discount.variants?.map((v) => v.id) || [],
      });
    }
  }, [discount]);

  // Get all variants from all products
  const allVariants = useMemo(() => {
    return products.flatMap(product =>
      product.variants?.map(variant => ({
        ...variant,
        productTitle: product.title,
      })) || []
    );
  }, [products]);

  // Helper functions
  const getProductIdForVariant = (variantId: string): string | null => {
    for (const product of products) {
      if (product.variants?.some(v => v.id === variantId)) {
        return product.id;
      }
    }
    return null;
  };

  const getVariantIdsForProduct = (productId: string): string[] => {
    const product = products.find(p => p.id === productId);
    return product?.variants?.map(v => v.id) || [];
  };

  // Filtered products (exclude if variants are selected)
  const filteredProducts = useMemo(() => {
    if (productSearch.length < 2) return [];
    return products.filter(
      (p) =>
        (p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.id.toLowerCase().includes(productSearch.toLowerCase())) &&
        !p.variants?.some(v => editData.variantIds.includes(v.id))
    );
  }, [productSearch, products, editData.variantIds]);

  // Filtered variants (exclude if parent products are selected)
  const filteredVariants = useMemo(() => {
    if (variantSearch.length < 2) return [];
    return allVariants.filter(
      (v) =>
        (v.name?.toLowerCase().includes(variantSearch.toLowerCase()) ||
          v.sku?.toLowerCase().includes(variantSearch.toLowerCase()) ||
          v.productTitle.toLowerCase().includes(variantSearch.toLowerCase()) ||
          v.id.toLowerCase().includes(variantSearch.toLowerCase())) &&
        !editData.productIds.some(productId => {
          const product = products.find(p => p.id === productId);
          return product?.variants?.some(variant => variant.id === v.id);
        })
    );
  }, [variantSearch, allVariants, editData.productIds, products]);

  // Handlers
  const addProductToList = (productId: string) => {
    if (!editData.productIds.includes(productId)) {
      const variantIdsToRemove = getVariantIdsForProduct(productId);
      setEditData({
        ...editData,
        productIds: [...editData.productIds, productId],
        variantIds: editData.variantIds.filter(id => !variantIdsToRemove.includes(id)),
      });
    }
  };

  const removeProductFromList = (productId: string) => {
    setEditData({
      ...editData,
      productIds: editData.productIds.filter((id) => id !== productId),
    });
  };

  const addVariantToList = (variantId: string) => {
    if (!editData.variantIds.includes(variantId)) {
      const conflictingProductId = getProductIdForVariant(variantId);
      setEditData({
        ...editData,
        variantIds: [...editData.variantIds, variantId],
        productIds: conflictingProductId
          ? editData.productIds.filter(id => id !== conflictingProductId)
          : editData.productIds,
      });
    }
  };

  const removeVariantFromList = (variantId: string) => {
    setEditData({
      ...editData,
      variantIds: editData.variantIds.filter((id) => id !== variantId),
    });
  };

  const handleSaveChanges = async () => {
    setisUpdating(true);
    if (!discount) return;

    try {
      // Convert local state to API format
      const updatedDiscount: Partial<Discount> = {
        code: editData.code,
        description: editData.description || null,
        type: editData.type,
        value: editData.value,
        usageLimit: editData.usageLimit || null,
        startsAt: editData.startsAt,
        endsAt: editData.endsAt || null,
        isActive: editData.isActive,
        minSubtotal: editData.minSubtotal || null,
        productIds: editData.productIds,
        variantIds: editData.variantIds,
      };

      await onUpdateDiscount(updatedDiscount, discount.id);

      onOpenChange(false);
      setProductSearch("");
      setVariantSearch("");
    } catch (error) {
      console.error("Error updating discount:", error);
    } finally {
      setisUpdating(false);
    }
  };

  if (!discount) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Discount</DialogTitle>
          <DialogDescription>Update discount code details.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Code</Label>
            <Input
              value={editData.code}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  code: e.target.value.toUpperCase(),
                })
              }
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Description</Label>
            <Textarea
              value={editData.description}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  description: e.target.value,
                })
              }
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Type</Label>
            <Select
              value={editData.type}
              onValueChange={(value: "percentage" | "fixed_amount"
                // | "free_shipping"
              ) =>
                setEditData({ ...editData, type: value })
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                {/* <SelectItem value="free_shipping">Free Shipping</SelectItem> */}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Value</Label>
            <Input
              type="number"
              value={editData.value}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  value: parseFloat(e.target.value),
                })
              }
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Start Date</Label>
            <Input
              type="datetime-local"
              value={editData.startsAt.toISOString().slice(0, 16)}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  startsAt: new Date(e.target.value),
                })
              }
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">End Date</Label>
            <Input
              type="datetime-local"
              value={editData.endsAt?.toISOString().slice(0, 16) || ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  endsAt: e.target.value ? new Date(e.target.value) : undefined,
                })
              }
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Min. Subtotal</Label>
            <Input
              type="number"
              value={editData.minSubtotal ?? ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  minSubtotal: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className="col-span-3"
              placeholder="0.00"
            />
          </div>

          {/* Product Search */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Applies to Products</Label>
            <div className="col-span-3 space-y-2">
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search by product name or ID"
              />
              {filteredProducts.length > 0 && (
                <div className="border rounded p-2 max-h-[150px] overflow-y-auto space-y-1">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="cursor-pointer hover:bg-muted p-1 rounded text-sm"
                      onClick={() => addProductToList(product.id)}
                    >
                      {product.title} ({product.id})
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {editData.productIds.map((productId) => {
                  const product = products.find((p) => p.id === productId);
                  return (
                    <Badge key={productId} variant="secondary">
                      {product?.title || productId}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => removeProductFromList(productId)}
                      />
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Variant Search */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Applies to Variants</Label>
            <div className="col-span-3 space-y-2">
              <Input
                value={variantSearch}
                onChange={(e) => setVariantSearch(e.target.value)}
                placeholder="Search by variant name, SKU, product, or ID"
              />
              {filteredVariants.length > 0 && (
                <div className="border rounded p-2 max-h-[150px] overflow-y-auto space-y-1">
                  {filteredVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className="cursor-pointer hover:bg-muted p-1 rounded text-sm"
                      onClick={() => addVariantToList(variant.id)}
                    >
                      <div className="font-medium">{variant.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {variant.productTitle} • SKU: {variant.sku || 'N/A'} • ID: {variant.id}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {editData.variantIds.map((variantId) => {
                  const variant = allVariants.find((v) => v.id === variantId);
                  return (
                    <Badge key={variantId} variant="secondary">
                      {variant?.name || variantId}
                      {variant?.sku && ` (${variant.sku})`}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => removeVariantFromList(variantId)}
                      />
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Usage Limit</Label>
            <Input
              type="number"
              value={editData.usageLimit ?? ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  usageLimit: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="col-span-3"
              placeholder="Unlimited"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Active</Label>
            <div className="flex items-center space-x-2 col-span-3">
              <Switch
                checked={editData.isActive}
                onCheckedChange={(checked) =>
                  setEditData({ ...editData, isActive: checked })
                }
              />
              <Label>{editData.isActive ? "Active" : "Inactive"}</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveChanges}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}