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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Edit,
  MoreHorizontal,
  Percent,
  Plus,
  Search,
  Tag,
  Trash,
} from "lucide-react";
import type { Discount } from "@/types";
import { format } from "date-fns";
import { AddDiscountModal } from "./components/add-discount-modal";
import { EditDiscountModal } from "./components/edit-discount-modal";
import { DeleteDiscountModal } from "./components/delete-discount-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@tremor/react";
import { CardContent, CardHeader } from "@/components/ui/card";
import { useShallow } from "zustand/react/shallow";
import { toast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DiscountsPage() {
  const {
    discounts,
    products,
    fetchDiscounts,
    fetchProducts,
    addDiscount,
    updateDiscount,
    deleteDiscount,
  } = useStore(
    useShallow((state) => ({
      discounts: state.discounts,
      products: state.products,
      fetchDiscounts: state.fetchDiscounts,
      fetchProducts: state.fetchProducts,
      addDiscount: state.addDiscount,
      updateDiscount: state.updateDiscount,
      deleteDiscount: state.deleteDiscount,
    }))
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("discounts");
  const [isAddDiscountOpen, setIsAddDiscountOpen] = useState(false);
  const [isEditDiscountOpen, setIsEditDiscountOpen] = useState(false);
  const [isDeleteDiscountOpen, setIsDeleteDiscountOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // useEffect(() => {
  //   const discounts = useStore.getState().discounts;
  //   if (!discounts || discounts.length === 0) {
  //     useStore
  //       .getState()
  //       .fetchDiscounts()
  //       .then(() => {
  //         const updatedDiscounts = useStore.getState().discounts;
  //         console.log("[FETCHED_DISCOUNTS]", updatedDiscounts);
  //         setLoading(false);
  //       });
  //   } else {
  //     setLoading(false);
  //   }
  // }, []);

  useEffect(() => {
    const discounts = useStore.getState().discounts;
    const products = useStore.getState().products;
    if (!discounts || discounts.length === 0 || !products || products.length === 0) {
      Promise.all([useStore.getState().fetchDiscounts(), useStore.getState().fetchProducts()])
        .then(() => {
          const updatedDiscounts = useStore.getState().discounts;
          console.log("[FETCHED_DISCOUNTS]", updatedDiscounts);
          setLoading(false);
        })
        .catch((error) => {
          console.error("[FETCH_DISCOUNTS_OR_PRODUCTS]", error);
          toast({
            title: "Error",
            description: "Failed to fetch discounts or products.",
            variant: "destructive",
          });
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [toast]);

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

  const filteredDiscounts = discounts.filter(
    (discount) =>
      discount.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (discount.description &&
        discount.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const paginatedDiscounts = filteredDiscounts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAddDiscount = async (discountData: Discount) => {
    try {
      await addDiscount(discountData);
      await fetchDiscounts();
      toast({
        title: "Discount Created",
        description: "Discount has been created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create discount. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateDiscount = async (
    id: string,
    updatedData: Partial<Discount>
  ) => {
    try {
      await updateDiscount(id, updatedData);
      await fetchDiscounts();
      toast({
        title: "Discount Updated",
        description: `${updatedData.code} has been updated successfully.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "There was a problem updating the discount.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    try {
      await deleteDiscount(id);
      await fetchDiscounts();
      toast({
        title: "Discount Deleted",
        description: `${selectedDiscount?.code} has been deleted.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "There was a problem deleting the discount.",
        variant: "destructive",
      });
    }
  };

  const openEditModal = (discount: Discount) => {
    setSelectedDiscount(discount);
    setIsEditDiscountOpen(true);
  };

  const openDeleteModal = (discount: Discount) => {
    setSelectedDiscount(discount);
    setIsDeleteDiscountOpen(true);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Discounts</h2>
        <Button onClick={() => setIsAddDiscountOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Discount
        </Button>
      </div>

      <Tabs defaultValue="discounts" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
        </TabsList>

        {filteredDiscounts.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium">No Discounts found</h3>
            <p className="text-muted-foreground">
              Create some and they'll appear here
            </p>
          </div>
        ) : (
          <>

            <div className="flex items-center mt-4">
              <div className="relative w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search discounts..."
                  className="w-full pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <TabsContent value="discounts" className="space-y-4">
              <div className="rounded-md border md:max-w-full max-w-[380px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead className="hidden md:table-cell">Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell text-center">
                        Dates
                      </TableHead>
                      <TableHead className="text-left">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDiscounts.map((discount) => (
                      <TableRow key={discount.id}>
                        <TableCell className="font-medium">{discount.code}</TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                          {discount.type === "percentage" ? (
                            <span className="flex items-center justify-center">
                              <Percent className="h-4 w-4 mr-1" />
                              Percentage
                            </span>
                          ) : discount.type === "fixed_amount" ? (
                            <span className="flex items-center justify-center">
                              <Tag className="h-4 w-4 mr-1" />
                              Fixed Amount
                            </span>
                          ) : (
                            <span className="flex items-center justify-center">
                              <Tag className="h-4 w-4 mr-1" />
                              Free Shipping
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {discount.type === "percentage"
                            ? `${discount.value}%`
                            : discount.type === "fixed_amount"
                              ? `₦${discount.value}`
                              : "Free"}
                        </TableCell>
                        <TableCell>
                          {discount.usageCount} / {discount.usageLimit ? discount.usageLimit : "∞"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${discount.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}
                          >
                            {discount.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                          <div className="text-xs">
                            <div>Start: {format(discount.startsAt, "MMM dd, yyyy")}</div>
                            {discount.endsAt && <div>End: {format(discount.endsAt, "MMM dd, yyyy")}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="text-xs">
                            {discount.products?.length ? (
                              <div>Products: {discount.products.map((p) => p.title).join(", ")}</div>
                            ) : null}
                            {discount.variants?.length ? (
                              <div>Variants: {discount.variants.map((v) => `${v.name} (${v.sku || 'N/A'})`).join(", ")}</div>
                            ) : null}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEditModal(discount)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDeleteModal(discount)}>
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <div className="">
              <div className="text-sm text-muted-foreground text-center ml-4 mt-4">
                Showing {paginatedDiscounts.length} of {discounts.length} discounts
              </div>
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
                  {Math.ceil(filteredDiscounts.length / itemsPerPage)}
                </span>
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(
                        prev + 1,
                        Math.ceil(filteredDiscounts.length / itemsPerPage)
                      )
                    )
                  }
                  disabled={
                    currentPage ===
                    Math.ceil(filteredDiscounts.length / itemsPerPage)
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Tabs>

      {/* Modals */}
      <AddDiscountModal
        open={isAddDiscountOpen}
        onOpenChange={setIsAddDiscountOpen}
        onAddDiscount={handleAddDiscount}
      />

      <EditDiscountModal
        open={isEditDiscountOpen}
        onOpenChange={setIsEditDiscountOpen}
        discount={selectedDiscount}
        onUpdateDiscount={(updated) => {
          if (selectedDiscount) {
            return handleUpdateDiscount(selectedDiscount.id, updated);
          }
        }}
      />

      <DeleteDiscountModal
        open={isDeleteDiscountOpen}
        onOpenChange={setIsDeleteDiscountOpen}
        discount={selectedDiscount}
        onDeleteDiscount={() => {
          if (selectedDiscount) {
            handleDeleteDiscount(selectedDiscount.id);
          }
        }}
      />
    </div>
  );
}
