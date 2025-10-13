"use client";

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
import type { Product, ProductVariant } from "@/types";
import { useEffect, useRef, useState } from "react";
import { Upload, X, Loader2, ImageIcon, Plus, Trash2 } from "lucide-react";
import Image from "next/image";

interface EditProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onUpdateProduct: (id: string, product: Partial<Product>) => void;
}

export function EditProductModal({
  open,
  onOpenChange,
  product,
  onUpdateProduct,
}: EditProductModalProps) {
  const [productForm, setProductForm] = useState<Partial<Product>>({
    title: "",
    description: "",
    price: 0,
    inventory: 0,
    category: "",
    subcategory: "",
    tags: [],
    imageUrl: "",
    imagePublicId: "",
    variants: [],
  });

  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setProductForm({
        title: product.title,
        description: product.description,
        price: product.price,
        inventory: product.inventory,
        category: product.category,
        subcategory: product.subcategory || "",
        tags: product.tags || [],
        imageUrl: product.imageUrl,
        imagePublicId: product.imagePublicId,
        variants: product.variants || [],
      });
      setPreviewImage(product.imageUrl || "");
    }
  }, [product]);

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload failed");

      const { imageUrl, imagePublicId } = await response.json();
      setProductForm((prev) => ({ ...prev, imageUrl, imagePublicId }));
      setPreviewImage(imageUrl);

      toast({ title: "Image uploaded", description: "Product image has been uploaded successfully." });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: "Failed to upload image. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const removeImage = () => {
    setProductForm({ ...productForm, imageUrl: "", imagePublicId: "" });
    setPreviewImage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Variants Management ---
  const addVariant = () => {
    setProductForm((prev) => ({
      ...prev,
      variants: [
        ...(prev.variants || []),
        { id: crypto.randomUUID(), sku: "", name: "", price: 0, inventory: 0 } as ProductVariant,
      ],
    }));
  };

  const updateVariant = (index: number, key: keyof ProductVariant, value: string | number) => {
    setProductForm((prev) => {
      const updated = [...(prev.variants || [])];
      updated[index] = { ...updated[index], [key]: value };
      return { ...prev, variants: updated };
    });
  };

  const removeVariant = (index: number) => {
    setProductForm((prev) => {
      const updated = [...(prev.variants || [])];
      updated.splice(index, 1);
      return { ...prev, variants: updated };
    });
  };

  const saveProductChanges = async () => {
    setIsSaving(true);
    if (!product) return;

    try {
      // Just call the store function - it handles the API call and state update
      await onUpdateProduct(product.id, productForm);

      onOpenChange(false);

      toast({
        title: "Product Updated",
        description: `${productForm.title} has been updated successfully.`
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "There was a problem updating the product.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const CATEGORY_MAP: Record<string, string[]> = {
    Clothing: ["T-Shirts", "Sweatshirts", "Caps", "Bags"],
    "Health & Nutrition": ["Protein Formula", "Supplements"],
    Mugs: ["Ceramic", "Glass"],
    Journals: ["Notebooks", "Planners"],
    Stickers: ["Vinyl", "Paper"],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>Update the product details.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Image Upload Section */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right mt-2">Product Image</Label>
            <div className="col-span-3 space-y-2">
              {previewImage ? (
                <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                  <Image src={previewImage} alt="Product preview" fill className="object-cover" sizes="128px" />
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
                      <span className="text-xs text-gray-500 text-center px-2">Click to upload</span>
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
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {previewImage ? "Change Image" : "Upload Image"}
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500">Optional. Max file size: 5MB. Formats: JPG, PNG, GIF, WebP</p>
            </div>
          </div>

          {/* Title */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-title" className="text-right">Title</Label>
            <Input id="edit-title" value={productForm.title} onChange={(e) => setProductForm({ ...productForm, title: e.target.value })} className="col-span-3" />
          </div>

          {/* Description */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-description" className="text-right">Description</Label>
            <Textarea id="edit-description" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className="col-span-3" />
          </div>

          {/* Price */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-price" className="text-right">Price</Label>
            <div className="col-span-3 space-y-1">
              <Input
                id="edit-price"
                type="number"
                value={productForm.price || 0}
                onChange={(e) => setProductForm({ ...productForm, price: Number.parseFloat(e.target.value) })}
                disabled={(productForm.variants?.length || 0) > 0} // disable if variants exist
              />
              {(productForm.variants?.length || 0) > 0 && (
                <p className="text-xs text-gray-500">Cannot edit price when variants exist. Update variant prices instead.</p>
              )}
            </div>
          </div>

          {/* Inventory */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-inventory" className="text-right">Inventory</Label>
            <div className="col-span-3 space-y-1">
              <Input
                id="edit-inventory"
                type="number"
                value={productForm.inventory || 0}
                onChange={(e) => setProductForm({ ...productForm, inventory: Number.parseInt(e.target.value) })}
                disabled={(productForm.variants?.length || 0) > 0} // disable if variants exist
              />
              {(productForm.variants?.length || 0) > 0 && (
                <p className="text-xs text-gray-500">Cannot edit inventory when variants exist. Update variant inventory instead.</p>
              )}
            </div>
          </div>


          {/* Category */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-category" className="text-right">Category</Label>
            <Select
              value={productForm.category}
              onValueChange={(value) => {
                setProductForm({ ...productForm, category: value, subcategory: "" });
              }}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CATEGORY_MAP).map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategory */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-subcategory" className="text-right">Subcategory</Label>
            <Select
              value={productForm.subcategory || ""}
              onValueChange={(value) => setProductForm({ ...productForm, subcategory: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Optional subcategory" />
              </SelectTrigger>
              <SelectContent>
                {(CATEGORY_MAP[productForm.category ?? ""] || []).map((sub) => (
                  <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-tags" className="text-right">Tags</Label>
            <Input id="edit-tags" placeholder="Comma separated tags" value={productForm.tags?.join(",") || ""} onChange={(e) => setProductForm({ ...productForm, tags: e.target.value ? e.target.value.split(",").map((tag) => tag.trim()) : [] })} className="col-span-3" />
          </div>

          {/* Variants */}
          <div>
            <Label className="mb-2 block">Variants</Label>
            <div className="space-y-3">
              {(productForm.variants || []).map((variant, index) => (
                <div key={variant.id} className="flex items-center gap-2 border p-2 rounded-lg">
                  <Input placeholder="SKU" value={variant.sku || ""} onChange={(e) => updateVariant(index, "sku", e.target.value)} className="w-24" />
                  <Input placeholder="Name" value={variant.name || ""} onChange={(e) => updateVariant(index, "name", e.target.value)} className="flex-1" />
                  <Input placeholder="Price" type="number" value={variant.price || 0} onChange={(e) => updateVariant(index, "price", Number.parseFloat(e.target.value))} className="w-24" />
                  <Input placeholder="Inventory" type="number" value={variant.inventory || 0} onChange={(e) => updateVariant(index, "inventory", Number.parseInt(e.target.value))} className="w-28" />
                  <Button type="button" variant="destructive" size="icon" onClick={() => removeVariant(index)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addVariant} className="mt-2"><Plus className="w-4 h-4 mr-2" /> Add Variant</Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={saveProductChanges}
            disabled={isSaving}
          >
            {isSaving ? (
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
