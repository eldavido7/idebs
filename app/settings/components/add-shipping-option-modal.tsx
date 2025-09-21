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

interface AddShippingOptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddShippingOption: (option: Omit<ShippingOption, "id">) => void;
  loading?: boolean;
}

export function AddShippingOptionModal({
  open,
  onOpenChange,
  onAddShippingOption,
  loading = false,
}: AddShippingOptionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Shipping Option</DialogTitle>
          <DialogDescription>
            Add a new shipping option to your store
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const option = {
              name: formData.get("name") as string,
              price: Number.parseFloat(formData.get("price") as string),
              deliveryTime: formData.get("deliveryTime") as string,
              status: formData.get("status") as "ACTIVE" | "CONDITIONAL",
            };
            if (
              !option.name.trim() ||
              isNaN(option.price) ||
              option.price < 0 ||
              !option.deliveryTime.trim()
            ) {
              alert(
                "Please fill in all fields correctly. Price must be non-negative."
              );
              return;
            }
            onAddShippingOption(option);
            e.currentTarget.reset();
          }}
        >
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shipping-name" className="text-right">
                Name
              </Label>
              <Input
                id="shipping-name"
                name="name"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shipping-price" className="text-right">
                Price (₦)
              </Label>
              <Input
                id="shipping-price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shipping-delivery" className="text-right">
                Delivery Time
              </Label>
              <Input
                id="shipping-delivery"
                name="deliveryTime"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shipping-status" className="text-right">
                Status
              </Label>
              <Select name="status" defaultValue="ACTIVE">
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
              {loading ? "Adding..." : "Add Shipping Option"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
