"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Barcode,
  ChevronDown,
  Edit,
  MoreHorizontal,
  Plus,
  Search,
  Trash,
} from "lucide-react";
import type { Product } from "@/types";
import { AddProductModal } from "./components/add-product-modal";
import { EditProductModal } from "./components/edit-product-modal";
import { DeleteProductModal } from "./components/delete-product-modal";
import { BarcodeModal } from "./components/barcode-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@tremor/react";
import { CardContent, CardHeader } from "@/components/ui/card";

// Seed categories and subcategories
const CATEGORIES = {
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

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, orders } =
    useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const products = useStore.getState().products;
    if (!products || products.length === 0) {
      useStore
        .getState()
        .fetchProducts()
        .then(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

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

  // Filter logic
  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    const inProduct =
      product.title.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query) ||
      (product.subcategory?.toLowerCase().includes(query) ?? false);
    const inVariants =
      product.variants?.some(
        (v) =>
          v.name?.toLowerCase().includes(query) ||
          v.sku?.toLowerCase().includes(query)
      ) ?? false;
    return inProduct || inVariants;
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Products</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Search + Category filter */}
      <div className="flex items-center">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products, variants, sku..."
            className="w-full pl-8"
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-2">
              Categories
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-96 overflow-y-auto">
            <DropdownMenuItem onClick={() => setSearchQuery("")}>
              All Categories
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {Object.entries(CATEGORIES).map(([cat, subs]) => (
              <div key={cat}>
                <DropdownMenuLabel>{cat}</DropdownMenuLabel>
                {subs.map((sub) => (
                  <DropdownMenuItem
                    key={sub}
                    onClick={() => setSearchQuery(sub)}
                  >
                    {sub}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Products Table */}
      {filteredProducts.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-medium">No products found</h3>
            <p className="text-muted-foreground">
              Create some and they'll appear here
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell text-center">
                    Category / Subcategory
                  </TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Inventory</TableHead>
                  <TableHead className="text-right">Variants</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => {
                  const hasVariants = product.variants && product.variants.length > 0;
                  const variantPrices = hasVariants
                    ? product.variants!
                      .map((v) => v.price ?? product.price)
                      .filter((p): p is number => p != null)
                    : [];
                  const minPrice = variantPrices.length
                    ? Math.min(...variantPrices)
                    : product.price;
                  const totalInventory = hasVariants
                    ? product.variants!.reduce(
                      (sum, v) => sum + (v.inventory ?? 0),
                      0
                    )
                    : product.inventory;

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        {product.category}
                        {product.subcategory ? ` / ${product.subcategory}` : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasVariants
                          ? `from ₦${minPrice?.toFixed(2)}`
                          : `₦${product.price?.toFixed(2)}`}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${(totalInventory ?? 0) < 10
                            ? "bg-red-100 text-red-800"
                            : (totalInventory ?? 0) < 30
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                            }`}
                        >
                          {totalInventory ?? 0}
                        </span>

                      </TableCell>
                      <TableCell className="text-right">
                        {hasVariants ? product.variants!.length : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteProduct(product)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsBarcodeDialogOpen(true);
                              }}
                            >
                              <Barcode className="mr-2 h-4 w-4" />
                              View Barcode
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {/* Pagination */}
            <div className="flex justify-between items-center p-4">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span>
                Page {currentPage} of{" "}
                {Math.ceil(filteredProducts.length / itemsPerPage)}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(
                      prev + 1,
                      Math.ceil(filteredProducts.length / itemsPerPage)
                    )
                  )
                }
                disabled={
                  currentPage === Math.ceil(filteredProducts.length / itemsPerPage)
                }
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <AddProductModal
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddProduct={addProduct}
      />
      <EditProductModal
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        product={selectedProduct}
        onUpdateProduct={updateProduct}
      />
      <DeleteProductModal
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        product={selectedProduct}
        orders={orders}
        onDeleteProduct={deleteProduct}
      />
      <BarcodeModal
        open={isBarcodeDialogOpen}
        onOpenChange={setIsBarcodeDialogOpen}
        product={selectedProduct}
        onUpdateProduct={updateProduct}
      />
    </div>
  );
}
