"use client"

import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ConfirmStatusModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  statusToUpdate: string
  onConfirm: () => void
}

export function ConfirmStatusModal({ open, onOpenChange, statusToUpdate, onConfirm }: ConfirmStatusModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Confirm Status Update
          </DialogTitle>
          <DialogDescription>
            Changing the order status to {statusToUpdate} will update inventory levels. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="default">
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
