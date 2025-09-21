"use client";

import {
  getSalesData,
  getTopProducts,
  getCategoryAnalytics,
  getLowStockAlerts,
  useStore,
  useSettingsStore,
} from "@/store/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowUpIcon,
  DollarSign,
  Package,
  ShoppingCart,
  AlertTriangle,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";

// Define chart data types
interface ChartData {
  name: string;
  value: number;
}

// Import charts with dynamic imports and disable SSR
const LineChart = dynamic(() => import("@/components/charts/line-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />,
});
const BarChart = dynamic(() => import("@/components/charts/bar-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />,
});
const DonutChart = dynamic(() => import("@/components/charts/donut-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />,
});

export default function Dashboard() {
  const { products, orders, discounts, fetchOrders, fetchProducts, fetchDiscounts } = useStore();
  const { users, shippingOptions, fetchSettings } = useSettingsStore();
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [discountsLoading, setDiscountsLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!orders || orders.length === 0) {
          await fetchOrders();
          console.log("[FETCHED_ORDERS]", orders);
        }
        setOrdersLoading(false);
      } catch (error) {
        console.error("[FETCH_ORDERS_ERROR]", error);
        toast({
          title: "Error",
          description: "Failed to fetch orders. Please try again.",
          variant: "destructive",
        });
        setOrdersLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!products || products.length === 0) {
          await fetchProducts();
          console.log("[FETCHED_PRODUCTS]", products);
        }
        setProductsLoading(false);
      } catch (error) {
        console.error("[FETCH_PRODUCTS_ERROR]", error);
        toast({
          title: "Error",
          description: "Failed to fetch products. Please try again.",
          variant: "destructive",
        });
        setProductsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!discounts || discounts.length === 0) {
          await fetchDiscounts();
          console.log("[FETCHED_DISCOUNTS]", discounts);
        }
        setDiscountsLoading(false);
      } catch (error) {
        console.error("[FETCH_DISCOUNTS_ERROR]", error);
        toast({
          title: "Error",
          description: "Failed to fetch discounts. Please try again.",
          variant: "destructive",
        });
        setDiscountsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (users.length === 0) {
          await fetchSettings();
          console.log("[FETCHED_SETTINGS]", { users, shippingOptions });
        }
        setSettingsLoading(false);
      } catch (error) {
        console.error("[FETCH_SETTINGS_ERROR]", error);
        toast({
          title: "Error",
          description: "Failed to fetch settings. Please try again.",
          variant: "destructive",
        });
        setSettingsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (ordersLoading || productsLoading || discountsLoading || settingsLoading) {
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

  // Calculate dashboard metrics with variant-aware revenue
  const totalRevenue = orders
    .filter((order) => order.status === "DELIVERED" || order.status === "SHIPPED")
    .reduce((sum, order) => sum + (order.total || 0), 0);

  const totalOrders = orders.length;
  const totalProducts = products.length;

  // Count total variants across all products
  const totalVariants = products.reduce((sum, product) => {
    return sum + (product.variants?.length ?? 0);
  }, 0);

  const totalCustomers = new Set(orders.map((order) => order.email)).size;

  // Calculate recent stats
  const pendingOrders = orders.filter((order) => order.status === "PENDING").length;
  const processingOrders = orders.filter((order) => order.status === "PROCESSING").length;
  const shippedOrders = orders.filter((order) => order.status === "SHIPPED").length;
  const deliveredOrders = orders.filter((order) => order.status === "DELIVERED").length;

  // Use the improved low stock alerts function
  const lowStockAlerts = getLowStockAlerts(products, 10);
  const lowStockCount = lowStockAlerts.length;
  const criticalStockCount = lowStockAlerts.filter(alert => alert.currentStock < 5).length;

  // Calculate total inventory including variants
  const totalInventory = products.reduce((sum, product) => {
    if (product.variants?.length) {
      return sum + product.variants.reduce((variantSum, v) => variantSum + (v.inventory ?? 0), 0);
    }
    return sum + (product.inventory ?? 0);
  }, 0);

  // Calculate percentage change for revenue and orders (last 30 days vs previous 30 days)
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prev30Days = new Date(last30Days.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentRevenue = orders
    .filter((order) => order.status === "DELIVERED" || order.status === "SHIPPED")
    .filter((order) => new Date(order.createdAt) >= last30Days)
    .reduce((sum, order) => sum + (order.total || 0), 0);
  const prevRevenue = orders
    .filter((order) => order.status === "DELIVERED" || order.status === "SHIPPED")
    .filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt < last30Days && createdAt >= prev30Days;
    })
    .reduce((sum, order) => sum + (order.total || 0), 0);
  const revenueChange = prevRevenue > 0 ? ((recentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  const recentOrders = orders.filter((order) => new Date(order.createdAt) >= last30Days).length;
  const prevOrders = orders.filter((order) => {
    const createdAt = new Date(order.createdAt);
    return createdAt < last30Days && createdAt >= prev30Days;
  }).length;
  const ordersChange = prevOrders > 0 ? ((recentOrders - prevOrders) / prevOrders) * 100 : 0;

  // Calculate order status distribution for pie chart
  const orderStatusData: ChartData[] = [
    { name: "Pending", value: pendingOrders },
    { name: "Processing", value: processingOrders },
    { name: "Shipped", value: shippedOrders },
    { name: "Delivered", value: deliveredOrders },
    { name: "Cancelled", value: orders.filter((order) => order.status === "CANCELLED").length },
  ].filter((item) => item.value > 0);

  // Get category analytics with variant-aware calculations
  const categoryAnalytics = getCategoryAnalytics(products, orders.map((order) => ({
    ...order,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
  })));

  const categoryData: ChartData[] = categoryAnalytics.map(cat => ({
    name: cat.name,
    value: cat.productCount,
  }));

  const salesData = getSalesData(
    orders.map((order) => ({
      ...order,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    }))
  );

  const { topByRevenue, topByQuantity } = getTopProducts(
    orders.map((order) => ({
      ...order,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    }))
  );

  return (
    <div className="space-y-6 p-6 pt-6 md:p-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to your IDEBS dashboard. Here's what's happening with your herbal medicine store today.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalRevenue.toLocaleString()}</div>
            <div className="flex items-center pt-1">
              <ArrowUpIcon className={cn("mr-1 h-3 w-3", revenueChange >= 0 ? "text-green-500" : "text-red-500")} />
              <span className={cn("text-xs font-medium", revenueChange >= 0 ? "text-green-500" : "text-red-500")}>
                {revenueChange >= 0 ? "+" : ""}{revenueChange.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <div className="flex items-center pt-1">
              <ArrowUpIcon className={cn("mr-1 h-3 w-3", ordersChange >= 0 ? "text-green-500" : "text-red-500")} />
              <span className={cn("text-xs font-medium", ordersChange >= 0 ? "text-green-500" : "text-red-500")}>
                {ordersChange >= 0 ? "+" : ""}{ordersChange.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Catalog</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <span>{totalVariants} variants</span>
              {lowStockCount > 0 ? (
                <div className="flex items-center">
                  <AlertTriangle className="mr-1 h-3 w-3 text-amber-500" />
                  <span className="text-amber-500 font-medium">{lowStockCount} low stock</span>
                </div>
              ) : (
                <span className="text-green-600">All in stock</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Unique customers
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-full lg:col-span-4">
              <CardHeader>
                <CardTitle>Revenue Over Time</CardTitle>
                <CardDescription>Monthly revenue for the past year</CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={salesData}
                  categories={["revenue"]}
                  index="date"
                  colors={["emerald"]}
                  valueFormatter={(value: number) => `₦${value.toLocaleString()}`}
                  yAxisWidth={70}
                  height={350}
                />
              </CardContent>
            </Card>

            <Card className="col-span-full lg:col-span-3">
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
                <CardDescription>Distribution of orders by status</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <DonutChart
                  data={orderStatusData}
                  index="name"
                  categories={["value"]}
                  colors={["blue", "amber", "emerald", "indigo", "red"]}
                  valueFormatter={(value: number) => `${value} orders`}
                  height={300}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-full lg:col-span-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>You have {pendingOrders} pending orders</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {orders.slice(0, 5).map((order) => (
                    <div className="flex items-center justify-between" key={order.id}>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {order.firstName} {order.lastName}
                        </p>
                        <div className="flex items-center text-sm text-muted-foreground gap-2">
                          <span>{order.items.length} {order.items.length === 1 ? "item" : "items"}</span>
                          <span>•</span>
                          <span>₦{order.total.toLocaleString()}</span>
                          {order.discount && (
                            <span className="text-xs text-muted-foreground italic">
                              Discount Applied ({order.discount.code || "N/A"})
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          order.status === "DELIVERED" && "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100",
                          order.status === "SHIPPED" && "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-100",
                          order.status === "PROCESSING" && "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-100",
                          order.status === "PENDING" && "bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-100",
                          order.status === "CANCELLED" && "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-100"
                        )}
                        variant="outline"
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-full lg:col-span-3">
              <CardHeader>
                <CardTitle>Stock Alerts</CardTitle>
                <CardDescription>
                  {lowStockCount} items low in stock
                  {criticalStockCount > 0 && `, ${criticalStockCount} critical`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {lowStockAlerts.length > 0 ? (
                    lowStockAlerts.slice(0, 5).map((alert, index) => {
                      const isCritical = alert.currentStock < 5;
                      const maxStock = 50; // Assumed maximum for progress calculation
                      return (
                        <div className="space-y-2" key={`${alert.productId}-${alert.variantId || 'main'}-${index}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium leading-none">{alert.productTitle}</p>
                              <p className="text-sm text-muted-foreground">
                                {alert.type === 'variant'
                                  ? `Variant: ${alert.variantName}`
                                  : 'Main product'
                                }
                              </p>
                            </div>
                            <Badge
                              className={cn(
                                isCritical
                                  ? "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-100"
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-100"
                              )}
                              variant="outline"
                            >
                              {isCritical ? "Critical" : "Low"}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>Stock: {alert.currentStock}</span>
                              <span>{Math.round((alert.currentStock / maxStock) * 100)}%</span>
                            </div>
                            <Progress
                              value={Math.round((alert.currentStock / maxStock) * 100)}
                              className={cn(isCritical ? "text-red-600" : "text-amber-600")}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Package className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">All items in stock</h3>
                      <p className="text-sm text-muted-foreground mt-1">Your inventory levels are healthy</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Top Products by Revenue</CardTitle>
                <CardDescription>Best selling products by revenue (variant-aware)</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={topByRevenue.slice(0, 8)}
                  index="title"
                  categories={["totalRevenue"]}
                  colors={["emerald"]}
                  valueFormatter={(value: number) => `₦${value.toLocaleString()}`}
                  yAxisWidth={60}
                  height={350}
                />
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Product Categories</CardTitle>
                <CardDescription>Distribution of products by category</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <DonutChart
                  data={categoryData}
                  index="name"
                  categories={["value"]}
                  colors={["blue", "emerald", "amber", "purple", "indigo"]}
                  valueFormatter={(value: number) => `${value} products`}
                  height={350}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Orders Over Time</CardTitle>
              <CardDescription>Monthly order volume</CardDescription>
            </CardHeader>
            <CardContent>
              <LineChart
                data={salesData}
                categories={["orders"]}
                index="date"
                colors={["blue"]}
                valueFormatter={(value: number) => `${value.toLocaleString()} orders`}
                yAxisWidth={70}
                height={350}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}