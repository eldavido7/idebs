"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Edit,
  MoreHorizontal,
  Plus,
  Trash,
  User as UserIcon,
} from "lucide-react";
import { AddShippingOptionModal } from "./components/add-shipping-option-modal";
import { EditShippingOptionModal } from "./components/edit-shipping-option-modal";
import { AddUserModal } from "./components/add-user-modal";
import { EditUserModal } from "./components/edit-user-modal";
import { DeleteUserModal } from "./components/delete-user-modal";
import { useToast } from "@/components/ui/use-toast";
import { ShippingOption, User } from "@/types/index";
import { useAuthStore, useSettingsStore } from "@/store/store";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");

  const [loading, setLoading] = useState(true);

  // Add these state variables at the top level of your component
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shippingToDelete, setShippingToDelete] = useState<string | null>(null);

  // Add this function to handle the actual deletion after confirmation
  const handleDeleteConfirm = () => {
    if (shippingToDelete) {
      deleteShippingOption(shippingToDelete);
      setDeleteDialogOpen(false);
      setShippingToDelete(null);
    }
  };

  // Shipping modal states
  const [isAddShippingOpen, setIsAddShippingOpen] = useState(false);
  const [isEditShippingOpen, setIsEditShippingOpen] = useState(false);
  const [currentShipping, setCurrentShipping] = useState<ShippingOption | null>(
    null
  );

  const [theloggedInUser, setLoggedInUser] = useState<User | null>(null);

  // User modal states
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [addUserLoading, setAddUserLoading] = useState(false);
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);
  const [addShippingLoading, setAddShippingLoading] = useState(false);
  const [editShippingLoading, setEditShippingLoading] = useState(false);

  // Access store data and methods
  const {
    users,
    shippingOptions,
    fetchSettings,
    createUser,
    updateUser,
    deleteUser,
    createShipping,
    updateShipping,
    deleteShipping,
  } = useSettingsStore();

  const { user: loggedInUser } = useAuthStore();

  useEffect(() => {
    if (users.length === 0 || shippingOptions.length === 0 || !users || !shippingOptions) {
      fetchSettings()
        .then(() => {
          setLoading(false);
          // Set the logged-in user from the auth store
          setLoggedInUser(currentUser);
        })
        .catch((error) => {
          console.error("Fetch settings error:", error);
          setLoading(false);
          toast({
            title: "Error",
            description: "Failed to fetch settings. Please try again.",
            variant: "destructive",
          });
        });
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

  // Shipping handlers
  const addShippingOption = async (option: Omit<ShippingOption, "id">) => {
    setAddShippingLoading(true);
    try {
      await createShipping(option);
      setIsAddShippingOpen(false);
      toast({
        title: "Shipping option added",
        description: "The shipping option has been added successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add shipping option. Please try again.",
        variant: "destructive",
      });
      console.error("Add shipping error:", error);
    } finally {
      setAddShippingLoading(false);
    }
  };

  const editShippingOption = async (option: ShippingOption) => {
    setEditShippingLoading(true);
    try {
      await updateShipping(option);
      setIsEditShippingOpen(false);
      setCurrentShipping(null);
      toast({
        title: "Shipping option updated",
        description: "The shipping option has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update shipping option. Please try again.",
        variant: "destructive",
      });
      console.error("Update shipping error:", error);
    } finally {
      setEditShippingLoading(false);
    }
  };

  const deleteShippingOption = async (id: string) => {
    try {
      await deleteShipping(id);
      toast({
        title: "Shipping option deleted",
        description: "The shipping option has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete shipping option. Please try again.",
        variant: "destructive",
      });
      console.error("Delete shipping error:", error);
    }
  };

  // User handlers
  const addUser = async (userData: Omit<User, "id" | "lastActive">) => {
    setAddUserLoading(true);
    try {
      await createUser(userData);
      setIsAddUserOpen(false);
      toast({
        title: "User added",
        description: "The user has been added successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add user. Please try again.",
        variant: "destructive",
      });
      console.error("Add user error:", error);
    } finally {
      setAddUserLoading(false);
    }
  };

  const editUser = async (userData: User) => {
    setEditUserLoading(true);
    try {
      await updateUser(userData);
      setIsEditUserOpen(false);
      setCurrentUser(null);
      toast({
        title: "User updated",
        description: "The user has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
        variant: "destructive",
      });
      console.error("Update user error:", error);
    } finally {
      setEditUserLoading(false);
    }
  };

  const removeUser = async (userId: string) => {
    if (loggedInUser && loggedInUser.id === userId) {
      toast({
        title: "Error",
        description: "You cannot delete your own account.",
        variant: "destructive",
      });
      return;
    }
    setDeleteUserLoading(true);
    try {
      await deleteUser(userId);
      setCurrentUser(null);
      setIsDeleteUserOpen(false);
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
      console.error("Delete user error:", error);
    } finally {
      setDeleteUserLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      <Tabs defaultValue="users" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
        </TabsList>

        <TabsContent value="shipping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Options</CardTitle>
              <CardDescription>
                Manage your store's shipping options
              </CardDescription>
            </CardHeader>

            <CardContent>
              {shippingOptions.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <h3 className="text-lg font-medium">No shipping options found</h3>
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
                          <TableHead className="hidden md:table-cell">
                            Price
                          </TableHead>
                          <TableHead className="hidden md:table-cell">
                            Delivery Time
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shippingOptions.map((option) => (
                          <TableRow key={option.id}>
                            <TableCell className="font-medium">
                              {option.name}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              ₦{option.price}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {option.deliveryTime}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${option.status === "ACTIVE"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                                  }`}
                              >
                                {option.status === "ACTIVE"
                                  ? "ACTIVE"
                                  : "CONDITIONAL"}
                              </span>
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
                                    onClick={() => {
                                      setCurrentShipping(option);
                                      setIsEditShippingOpen(true);
                                    }}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setShippingToDelete(option.id);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
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
                </>
              )}
              <div className="mt-4">
                <Button onClick={() => setIsAddShippingOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Shipping Option
                </Button>
              </div>
            </CardContent>
          </Card>

          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  shipping option.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShippingToDelete(null)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AddShippingOptionModal
            open={isAddShippingOpen}
            onOpenChange={setIsAddShippingOpen}
            onAddShippingOption={addShippingOption}
            loading={addShippingLoading}
          />

          <EditShippingOptionModal
            open={isEditShippingOpen}
            onOpenChange={setIsEditShippingOpen}
            shippingOption={currentShipping}
            onEditShippingOption={editShippingOption}
            loading={editShippingLoading}
          />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>Manage users that can login</CardDescription>
              </div>
              <Button onClick={() => setIsAddUserOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Email
                      </TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <UserIcon className="mr-2 h-4 w-4" />
                            {user.name}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const date = new Date(user.lastActive);
                            return `${date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })} at ${date.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`;
                          })()}
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
                                onClick={() => {
                                  setCurrentUser(user);
                                  setIsEditUserOpen(true);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setCurrentUser(user);
                                  setIsDeleteUserOpen(true);
                                }}
                              >
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
            </CardContent>
          </Card>

          {/* User Modals */}
          <AddUserModal
            open={isAddUserOpen}
            onOpenChange={setIsAddUserOpen}
            onAddUser={addUser}
            loading={addUserLoading}
          />

          <EditUserModal
            open={isEditUserOpen}
            onOpenChange={setIsEditUserOpen}
            user={currentUser}
            onEditUser={editUser}
            loading={editUserLoading}
          />

          <DeleteUserModal
            open={isDeleteUserOpen}
            onOpenChange={setIsDeleteUserOpen}
            user={currentUser}
            onDeleteUser={removeUser}
            loading={deleteUserLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
