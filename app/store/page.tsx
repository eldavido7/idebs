"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { StoreHeader } from "./components/store-header";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductVariant } from "@/types";
import { Toaster } from "@/components/ui/toaster";
import { useStore } from "@/store/store";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 9;

export default function StorePage() {
  const { addItem, items } = useCart();
  const { toast } = useToast();
  const { products } = useStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  useEffect(() => {
    const products = useStore.getState().products;
    if (!products || products.length === 0) {
      useStore
        .getState()
        .fetchProducts()
        .then(() => {
          setLoading(false);
        })
        .catch((error) => {
          console.error("Fetch products error:", error);
          setLoading(false);
          toast({
            title: "Error",
            description: "Failed to load products. Please try again.",
            variant: "destructive",
          });
        });
    } else {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const categories = [
    "all",
    ...Array.from(new Set(products.map((p) => p.category))),
  ];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.tags?.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    const totalInventory = product.variants?.length
      ? product.variants.reduce((sum, v) => sum + (v.inventory ?? 0), 0)
      : product.inventory ?? 0;
    return matchesSearch && matchesCategory && totalInventory > 0;
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handleOpenProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedVariant(null);
  };

  const handleAddToCart = (product: Product, variant?: ProductVariant) => {
    const availableInventory = variant
      ? variant.inventory
      : product.variants?.length
        ? product.variants.reduce((sum, v) => sum + (v.inventory ?? 0), 0)
        : product.inventory ?? 0;
    if (availableInventory <= 0) {
      toast({
        title: "Out of stock",
        description: `${product.title}${variant ? ` (${variant.name})` : ''} is out of stock.`,
        variant: "destructive",
      });
      return;
    }
    const effectivePrice = variant?.price ?? product.price;
    if (effectivePrice == null || effectivePrice <= 0) {
      toast({
        title: "Invalid price",
        description: `No valid price found for ${product.title}${variant ? ` (${variant.name})` : ''}.`,
        variant: "destructive",
      });
      return;
    }
    addItem(product, 1, variant);
    toast({
      title: "Added to cart",
      description: `${product.title}${variant ? ` - ${variant.name}` : ''} has been added to your cart.`,
    });
  };

  // Fixed isInCart function to properly handle both variants and non-variants
  const isInCart = (product: Product, variant?: ProductVariant) => {
    const targetVariantId = variant?.id ?? undefined;
    return items.some(
      (item) =>
        item.product.id === product.id &&
        item.variantId === targetVariantId
    );
  };

  // Helper function to check if any variant of a product is in cart (for products with variants)
  const isAnyVariantInCart = (product: Product) => {
    if (!product.variants?.length) {
      return isInCart(product);
    }
    return items.some(item => item.product.id === product.id);
  };

  if (isLoading || loading) {
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
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster />
      <StoreHeader />

      <main className="md:px-36 px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-48 max-h-96 overflow-y-auto">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {currentProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No products found
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {currentProducts.map((product) => {
              // For products with variants, check if any variant is in cart
              // For products without variants, check if the product itself is in cart
              const productInCart = product.variants?.length
                ? isAnyVariantInCart(product)
                : isInCart(product);

              return (
                <Card
                  key={product.id}
                  onClick={() => handleOpenProduct(product)}
                  className="overflow-hidden hover:shadow-lg transition cursor-pointer relative border-0"
                >
                  <div className="aspect-[3/3] relative ">
                    <Image
                      src={product.imageUrl || "/placeholder.svg"}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                    <Badge
                      className={cn(
                        "absolute top-2 right-2",
                        (product.variants?.length
                          ? product.variants.reduce((sum, v) => sum + (v.inventory ?? 0), 0)
                          : product.inventory ?? 0) < 10
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      )}
                    >
                      {product.variants?.length
                        ? `${product.variants.reduce((sum, v) => sum + (v.inventory ?? 0), 0)} in stock`
                        : `${product.inventory ?? 0} in stock`}
                    </Badge>
                  </div>
                  <div className="p-4 space-y-1">
                    <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-1">
                      {product.title}
                    </h3>
                    <p className="text-gray-500 text-sm md:line-clamp-2 line-clamp-1 ">
                      {product.description}
                    </p>
                    <div className="pt-1">
                      {product.variants?.length ? (
                        <>
                          <p className="text-gray-400 text-xs">From</p>
                          <p className="font-semibold text-gray-900 text-base">
                            ₦{Math.min(
                              ...product.variants
                                .map((v) => v.price)
                                .filter((price): price is number => price != null)
                            ).toLocaleString()}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-400 text-xs">Price</p>
                          <p className="font-semibold text-gray-900 text-base">
                            ₦{product.price?.toLocaleString() ?? 'N/A'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-4 pt-0">
                    <Button
                      className="w-full bg-[#bd9243] hover:bg-[#e3d183]"
                      disabled={productInCart}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent opening modal
                        if (!product.variants?.length) {
                          handleAddToCart(product);
                        } else {
                          handleOpenProduct(product);
                        }
                      }}
                    >
                      {productInCart ? "Added to Cart" : "Add to Cart"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center space-x-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                onClick={() => setCurrentPage(page)}
                className={
                  currentPage === page
                    ? "bg-green-600 hover:bg-green-700"
                    : ""
                }
              >
                {page}
              </Button>
            ))}
          </div>
        )}
      </main>

      <Dialog
        open={!!selectedProduct}
        onOpenChange={() => setSelectedProduct(null)}
      >
        <DialogContent className="max-w-lg">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProduct.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Image
                  src={selectedProduct.imageUrl || "/placeholder.svg"}
                  alt={selectedProduct.title}
                  width={400}
                  height={300}
                  className="rounded-md object-cover w-full h-64"
                />
                <p className="text-gray-700">{selectedProduct.description}</p>
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.variants.map((variant) => (
                      <div key={variant.id} className="relative">
                        <Button
                          variant={
                            selectedVariant?.id === variant.id
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setSelectedVariant(variant)}
                          className="rounded-full"
                        >
                          {variant.name} – ₦{variant.price?.toLocaleString() ?? 'N/A'}
                        </Button>
                        <Badge
                          className={cn(
                            "absolute top-0 right-0 -translate-y-1/2 translate-x-1/2",
                            (variant.inventory ?? 0) < 10
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          )}
                        >
                          {variant.inventory ?? 0}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  className="w-full bg-[#bd9243] hover:bg-[#e3d183]"
                  disabled={
                    // For products with variants, require variant selection and check if that specific variant is in cart
                    (selectedProduct.variants && selectedProduct.variants.length > 0 && !selectedVariant) ||
                    // For products without variants, check if product is in cart
                    // For products with variants and selected variant, check if that variant is in cart
                    isInCart(selectedProduct, selectedVariant || undefined)
                  }
                  onClick={() => handleAddToCart(selectedProduct, selectedVariant || undefined)}
                >
                  {isInCart(selectedProduct, selectedVariant || undefined)
                    ? "Added to Cart"
                    : "Add to Cart"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}