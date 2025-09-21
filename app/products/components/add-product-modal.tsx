"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Upload, X, Loader2, ImageIcon, Plus, Trash } from "lucide-react";
import Image from "next/image";
import type { Product, ProductVariant } from "@/types";

// --- Category + Subcategory map ---
const CATEGORY_MAP: Record<string, string[]> = {
  "Men's Fashion": [
    "Shoes",
    "Shirts",
    "Trousers",
    "Belts",
    "Accessories"
  ],
  "Women's Fashion": [
    "Shoes",
    "Dresses",
    "Bags",
    "Trousers/Skirts",
    "Shirts/Tops",
    "Belts",
    "Accessories"
  ],
  "Unisex / General": [
    "Perfumes & Fragrances",
    "Sunglasses & Eyewear",
    "Other Accessories"
  ],
  "Store Services": [
    "Dressing Room",
    "Gift Wrapping & Packaging",
    "Special Orders / Pre-Orders"
  ],
  "Seasonal / Collections": [
    "New Arrivals",
    "Luxury Collection",
    "Discount / Clearance"
  ]
};

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduct: (product: Product) => void;
}

export function AddProductModal({
  open,
  onOpenChange,
  onAddProduct,
}: AddProductModalProps) {
  const [productForm, setProductForm] = useState<Partial<Product>>({
    title: "",
    description: "",
    price: 0,
    inventory: 0,
    category: "",
    subcategory: "",
    tags: [],
    barcode: "",
    imageUrl: "",
    imagePublicId: "",
    variants: [],
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Variants handling ---
  const handleAddVariant = () => {
    const newVariant: ProductVariant = {
      id: crypto.randomUUID(),
      productId: "", // backend will assign
      sku: "",
      name: "",
      price: null,
      inventory: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setProductForm({
      ...productForm,
      variants: [...(productForm.variants || []), newVariant],
    });
  };

  const handleRemoveVariant = (id: string) => {
    setProductForm({
      ...productForm,
      variants: productForm.variants?.filter((v) => v.id !== id) || [],
    });
  };

  const handleVariantChange = (
    id: string,
    field: keyof ProductVariant,
    value: string | number | null
  ) => {
    setProductForm({
      ...productForm,
      variants: productForm.variants?.map((variant) =>
        variant.id === id ? { ...variant, [field]: value } : variant
      ),
    });
  };

  // --- Image upload ---
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const { imageUrl, imagePublicId } = await response.json();
      setProductForm({ ...productForm, imageUrl, imagePublicId });
      setPreviewImage(imageUrl);

      toast({ title: "Image uploaded", description: "Upload successful." });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const removeImage = () => {
    setProductForm({
      ...productForm,
      imageUrl: "",
      imagePublicId: "",
    });
    setPreviewImage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Save product ---
  const handleAddProduct = async () => {
    setIsAdding(true);
    try {
      if (!productForm.title || !productForm.description || !productForm.category) {
        toast({
          title: "Missing fields",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      const hasVariants = productForm.variants && productForm.variants.length > 0;

      if (!hasVariants && (!productForm.price || productForm.price <= 0)) {
        toast({ title: "Invalid price", description: "Price is required if no variants exist.", variant: "destructive" });
        return;
      }

      if (!hasVariants && (productForm.inventory == null || productForm.inventory < 0)) {
        toast({ title: "Invalid inventory", description: "Inventory is required if no variants exist.", variant: "destructive" });
        return;
      }

      const productData: Product = {
        id: crypto.randomUUID(),
        title: productForm.title!,
        description: productForm.description!,
        price: productForm.price!,
        inventory: productForm.inventory ?? 0,
        category: productForm.category!,
        subcategory: productForm.subcategory || undefined,
        tags: productForm.tags || [],
        barcode: productForm.barcode || "",
        imageUrl: productForm.imageUrl || "",
        imagePublicId: productForm.imagePublicId || "",
        variants: productForm.variants || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await onAddProduct(productData);
      onOpenChange(false);
      resetForm();
      toast({
        title: "Product Added",
        description: `${productForm.title} has been added successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const resetForm = () => {
    setProductForm({
      title: "",
      description: "",
      price: 0,
      inventory: 0,
      category: "",
      subcategory: "",
      tags: [],
      barcode: "",
      imageUrl: "",
      imagePublicId: "",
      variants: [],
    });
    setPreviewImage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the details to add a new product to your inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* IMAGE UPLOAD */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right mt-2">Product Image</Label>
            <div className="col-span-3 space-y-2">
              {previewImage ? (
                <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                  <Image
                    src={previewImage}
                    alt="Product preview"
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                  <button
                    title="remove image"
                    type="button"
                    onClick={removeImage}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    disabled={isUploading}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500 text-center px-2">
                        Click to upload
                      </span>
                    </>
                  )}
                </div>
              )}

              <input
                title="Product Image"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-fit"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {previewImage ? "Change Image" : "Upload Image"}
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500">
                Optional. Max file size: 5MB. Supported formats: JPG, PNG, GIF,
                WebP
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title *
            </Label>
            <Input
              id="title"
              value={productForm.title}
              onChange={(e) =>
                setProductForm({ ...productForm, title: e.target.value })
              }
              className="col-span-3"
              placeholder="Enter product title"
            />
          </div>

          {/* Description */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description *
            </Label>
            <Textarea
              id="description"
              value={productForm.description}
              onChange={(e) =>
                setProductForm({ ...productForm, description: e.target.value })
              }
              className="col-span-3"
              placeholder="Enter product description"
            />
          </div>

          {/* Price */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Price (₦) *
            </Label>
            <Input
              id="price"
              type="number"
              min="1"
              value={productForm.price}
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  price: Number.parseFloat(e.target.value) || 0,
                })
              }
              className="col-span-3"
              placeholder="0"
            />
          </div>

          {/* Inventory */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="inventory" className="text-right">
              Inventory
            </Label>
            <Input
              id="inventory"
              type="number"
              min="0"
              value={productForm.inventory}
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  inventory: Number.parseInt(e.target.value) || 0,
                })
              }
              className="col-span-3"
              placeholder="0"
            />
          </div>

          {/* Category */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category *
            </Label>
            <Select
              onValueChange={(value) =>
                setProductForm({ ...productForm, category: value, subcategory: "" })
              }
              value={productForm.category}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CATEGORY_MAP).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategory (depends on category) */}
          {productForm.category && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subcategory" className="text-right">
                Subcategory
              </Label>
              <Select
                onValueChange={(value) =>
                  setProductForm({ ...productForm, subcategory: value })
                }
                value={productForm.subcategory || ""}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_MAP[productForm.category]?.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tags */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">
              Tags
            </Label>
            <Input
              id="tags"
              placeholder="Comma separated tags"
              value={productForm.tags?.join(",") || ""}
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  tags: e.target.value
                    ? e.target.value.split(",").map((tag) => tag.trim())
                    : [],
                })
              }
              className="col-span-3"
            />
          </div>

          {/* Variants Section */}
          <div>
            <Label className="font-medium">Variants</Label>
            <div className="space-y-3 mt-2">
              {productForm.variants?.map((variant) => (
                <div
                  key={variant.id}
                  className="grid grid-cols-12 gap-2 items-center border p-2 rounded-md"
                >
                  <Input
                    placeholder="Name (e.g. Red/XL)"
                    value={variant.name || ""}
                    onChange={(e) =>
                      handleVariantChange(variant.id, "name", e.target.value)
                    }
                    className="col-span-3"
                  />
                  <Input
                    placeholder="SKU"
                    value={variant.sku || ""}
                    onChange={(e) =>
                      handleVariantChange(variant.id, "sku", e.target.value)
                    }
                    className="col-span-3"
                  />
                  <Input
                    type="number"
                    placeholder="Price (₦)"
                    value={variant.price ?? ""}
                    onChange={(e) =>
                      handleVariantChange(
                        variant.id,
                        "price",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="col-span-3"
                  />
                  <Input
                    type="number"
                    placeholder="Inventory"
                    value={variant.inventory}
                    onChange={(e) =>
                      handleVariantChange(
                        variant.id,
                        "inventory",
                        Number.parseInt(e.target.value) || 0
                      )
                    }
                    className="col-span-2"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveVariant(variant.id)}
                  >
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddVariant}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Variant
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddProduct} disabled={isUploading || isAdding}>
            {isUploading || isAdding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isUploading ? "Uploading..." : "Processing..."}
              </>
            ) : (
              "Add Product"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
