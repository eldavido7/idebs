"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import type { Product } from "@/types";
import { Printer, RefreshCw } from "lucide-react";
import Barcode from "react-barcode";

interface BarcodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onUpdateProduct: (id: string, product: Partial<Product>) => Promise<void>;
}

export function BarcodeModal({
  open,
  onOpenChange,
  product,
  onUpdateProduct,
}: BarcodeModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newBarcode, setNewBarcode] = useState("");
  const barcodeRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = (open: boolean) => {
    if (open && product) {
      setNewBarcode(product.barcode ? String(product.barcode) : "");
      setIsEditing(false);
    }
    onOpenChange(open);
  };

  const handlePrint = () => {
    if (!product) return;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const barcodeHTML = barcodeRef.current?.innerHTML;

      printWindow.document.write(`
        <html>
          <head>
            <title>Barcode: ${product.title}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
              .barcode-container { margin: 20px auto; }
              .product-info { margin-bottom: 20px; }
              svg { width: 100%; max-width: 300px; height: auto; }
            </style>
          </head>
          <body>
            <div class="product-info">
              <h2>${product.title}</h2>
              <p>SKU: ${product.id}</p>
              <p>Barcode:</p>
            </div>
            <div class="barcode-container">
              ${barcodeHTML || "Unable to render barcode."}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleUpdateBarcode = async () => {
    if (!product) return;

    try {
      await onUpdateProduct(product.id, { barcode: newBarcode });

      // Update the product's barcode locally
      product.barcode = newBarcode;

      setIsEditing(false);
      setNewBarcode("");

      toast({
        title: "Barcode Updated",
        description: `Barcode for ${product.title} has been updated.`,
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description:
          error?.message || "This barcode already exists or is invalid.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Product Barcode</DialogTitle>
          <DialogDescription>
            {product?.title} - View, print or update the barcode for this
            product.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          <div className="mb-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Barcode ID</p>
            <p className="font-mono text-lg">
              {product?.barcode || "No barcode assigned"}
            </p>
          </div>

          <div
            ref={barcodeRef}
            className="border rounded-md p-4 w-full max-w-[250px] flex justify-center mb-4"
          >
            <Barcode
              value={String(product?.barcode || "000000")}
              format="CODE128"
              width={2}
              height={100}
            />
          </div>

          {isEditing ? (
            <div className="w-full max-w-sm space-y-4">
              <div className="space-y-2">
                <label htmlFor="barcode" className="text-sm font-medium">
                  New Barcode
                </label>
                <Input
                  id="barcode"
                  value={newBarcode}
                  onChange={(e) => setNewBarcode(e.target.value)}
                  placeholder="Enter new barcode"
                  className="font-mono"
                />
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateBarcode}>Save Barcode</Button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-4">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print Barcode
              </Button>
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Update Barcode
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
