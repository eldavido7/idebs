"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ShippingOption } from "@/types/index";

interface EditShippingOptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shippingOption: ShippingOption | null;
  onEditShippingOption: (option: ShippingOption) => void;
  loading?: boolean;
}

export function EditShippingOptionModal({
  open,
  onOpenChange,
  shippingOption,
  onEditShippingOption,
  loading = false,
}: EditShippingOptionModalProps) {
  if (!shippingOption) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Shipping Option</DialogTitle>
          <DialogDescription>Update shipping option details</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            onEditShippingOption({
              id: shippingOption.id,
              name: formData.get("name") as string,
              price: Number.parseFloat(formData.get("price") as string),
              deliveryTime: formData.get("deliveryTime") as string,
              status: formData.get("status") as "ACTIVE" | "CONDITIONAL",
            });
          }}
        >
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-shipping-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-shipping-name"
                name="name"
                className="col-span-3"
                defaultValue={shippingOption.name}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-shipping-price" className="text-right">
                Price (₦)
              </Label>
              <Input
                id="edit-shipping-price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                className="col-span-3"
                defaultValue={shippingOption.price}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-shipping-delivery" className="text-right">
                Delivery Time
              </Label>
              <Input
                id="edit-shipping-delivery"
                name="deliveryTime"
                className="col-span-3"
                defaultValue={shippingOption.deliveryTime}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-shipping-status" className="text-right">
                Status
              </Label>
              <Select name="status" defaultValue={shippingOption.status}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="CONDITIONAL">Conditional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
