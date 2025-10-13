"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, DollarSign, Package, ShoppingCart, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  getSalesData,
  getTopProducts,
  getVariantAnalytics,
  getCategoryAnalytics,
  getLowStockAlerts,
  useStore
} from "@/store/store";

// Import charts with dynamic imports and disable SSR
const PieChart = dynamic(() => import("@/components/charts/pie-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />,
});

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("year");
  const { products, orders, discounts } = useStore();
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    const orders = useStore.getState().orders;
    if (!orders || orders.length === 0) {
      useStore
        .getState()
        .fetchOrders()
        .then(() => {
          const updatedOrders = useStore.getState().orders;
          console.log("[FETCHED_ORDERS]", updatedOrders);
          setOrdersLoading(false);
        });
    } else {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    const products = useStore.getState().products;
    if (!products || products.length === 0) {
      useStore
        .getState()
        .fetchProducts()
        .then(() => {
          const updatedProducts = useStore.getState().products;
          console.log("[FETCHED_PRODUCTS]", updatedProducts);
          setProductsLoading(false);
        });
    } else {
      setProductsLoading(false);
    }
  }, []);

  if (ordersLoading || productsLoading) {
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

  // Calculate analytics metrics with variant-aware pricing
  const totalRevenue = orders
    .filter((order) => order.status === "DELIVERED")
    .reduce((sum, order) => {
      return sum + order.total; // Order total already includes variant-adjusted pricing
    }, 0);

  const totalOrders = orders.length;
  const totalProducts = products.length;

  // Count total variants across all products
  const totalVariants = products.reduce((sum, product) => {
    return sum + (product.variants?.length ?? 0);
  }, 0);

  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Prepare data for charts with variant-aware analytics
  const categoryAnalytics = getCategoryAnalytics(products, orders.map((order) => ({
    ...order,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
  })));

  const categoryData = categoryAnalytics.map(cat => ({
    name: cat.name,
    value: cat.totalRevenue,
  }));

  // Calculate recent stats
  const pendingOrders = orders.filter((order) => order.status === "PENDING").length;
  const processingOrders = orders.filter((order) => order.status === "PROCESSING").length;
  const shippedOrders = orders.filter((order) => order.status === "SHIPPED").length;
  const deliveredOrders = orders.filter((order) => order.status === "DELIVERED").length;
  const canceledOrders = orders.filter((order) => order.status === "CANCELLED").length;

  const statusData = [
    { name: "Pending", value: pendingOrders },
    { name: "Processing", value: processingOrders },
    { name: "Shipped", value: shippedOrders },
    { name: "Delivered", value: deliveredOrders },
    { name: "Canceled", value: canceledOrders },
  ].filter((item) => item.value > 0);

  // Get low stock alerts including variants
  const lowStockAlerts = getLowStockAlerts(products, 10);
  const lowStockCount = lowStockAlerts.length;

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

  // Get variant-specific analytics
  const variantAnalytics = getVariantAnalytics(
    orders.map((order) => ({
      ...order,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    }))
  );

  const productPerformance = topByRevenue.map((p) => ({
    id: p.title,
    title: p.title,
    sales: p.totalSold,
    revenue: p.totalRevenue,
    avgPrice: p.totalSold > 0 ? p.totalRevenue / p.totalSold : 0,
    performance:
      p.totalRevenue > 30000
        ? "High"
        : p.totalRevenue > 10000
          ? "Medium"
          : "Low",
  }));

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <Select defaultValue={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
            <SelectItem value="quarter">Last 90 days</SelectItem>
            <SelectItem value="year">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₦{totalRevenue.toFixed(2)}
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Order Value
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₦{averageOrderValue.toFixed(2)}
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
                  {lowStockCount > 0 && (
                    <div className="flex items-center">
                      <AlertTriangle className="mr-1 h-3 w-3 text-amber-500" />
                      <span className="text-amber-500 font-medium">
                        {lowStockCount} low stock
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Revenue by Category</CardTitle>
                <CardDescription>
                  Revenue distribution across product categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PieChart
                  data={categoryData as any}
                  index="name"
                  categories={["value"]}
                  colors={[
                    "#3b82f6",
                    "#22c55e",
                    "#eab308",
                    "#a855f7",
                    "#6366f1",
                  ]}
                  valueFormatter={(value) => `₦${value.toLocaleString()}`}
                  height={350}
                />
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart
                  data={statusData as any}
                  index="name"
                  categories={["value"]}
                  colors={[
                    "#94a3b8",
                    "#facc15",
                    "#3b82f6",
                    "#22c55e",
                    "#ef4444",
                  ]}
                  valueFormatter={(value) => `${value} orders`}
                  height={350}
                />
              </CardContent>
            </Card>
          </div>

          {lowStockCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
                  Low Stock Alerts
                </CardTitle>
                <CardDescription>
                  Products and variants with inventory below threshold
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {lowStockAlerts.slice(0, 10).map((alert, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{alert.productTitle}</p>
                        {alert.type === 'variant' && (
                          <p className="text-sm text-muted-foreground">
                            Variant: {alert.variantName}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant={alert.currentStock === 0 ? "destructive" : "secondary"}>
                          {alert.currentStock} left
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Sales Performance</CardTitle>
              <CardDescription>
                Revenue and order count by month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">
                        Avg. Order Value
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.map((data) => (
                      <TableRow key={data.date}>
                        <TableCell className="font-medium">
                          {data.date}
                        </TableCell>
                        <TableCell className="text-right">
                          {data.orders}
                        </TableCell>
                        <TableCell className="text-right">
                          ₦{data.revenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ₦{data.orders > 0 ? (data.revenue / data.orders).toFixed(2) : '0.00'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
              <CardDescription>
                Revenue and performance metrics by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Products</TableHead>
                      <TableHead className="text-right">Units Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Avg. Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryAnalytics.map((category) => (
                      <TableRow key={category.name}>
                        <TableCell className="font-medium">
                          {category.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {category.productCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {category.totalUnitsSold}
                        </TableCell>
                        <TableCell className="text-right">
                          ₦{category.totalRevenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ₦{category.averagePrice.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Top Products by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart
                  data={topByRevenue.slice(0, 8) as any}
                  index="title"
                  categories={["totalRevenue"]}
                  colors={[
                    "#3b82f6",
                    "#22c55e",
                    "#eab308",
                    "#a855f7",
                    "#6366f1",
                    "#ef4444",
                    "#f97316",
                    "#06b6d4",
                  ]}
                  valueFormatter={(value) => `₦${value.toLocaleString()}`}
                  height={350}
                />
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Top Products by Units Sold</CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart
                  data={topByQuantity.slice(0, 8) as any}
                  index="title"
                  categories={["totalSold"]}
                  colors={[
                    "#3b82f6",
                    "#22c55e",
                    "#eab308",
                    "#a855f7",
                    "#6366f1",
                    "#ef4444",
                    "#f97316",
                    "#06b6d4",
                  ]}
                  valueFormatter={(value) => `${value.toLocaleString()} units`}
                  height={350}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Product Performance Matrix</CardTitle>
              <CardDescription>Revenue vs. Units Sold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Units Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="hidden md:table-cell text-right">
                        Avg. Price
                      </TableHead>
                      <TableHead className="hidden md:table-cell text-center">
                        Performance
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productPerformance.map((product) => (
                      <TableRow key={product.title}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {product.title}
                            {product.title.includes('[Deleted') && (
                              <Badge variant="outline" className="text-xs">
                                Deleted
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {product.sales}
                        </TableCell>
                        <TableCell className="text-right">
                          ₦{product.revenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right">
                          ₦{product.avgPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                          <Badge
                            variant={
                              product.performance === "High"
                                ? "default"
                                : product.performance === "Medium"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {product.performance}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variants" className="space-y-4">
          {totalVariants > 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Top Variants by Revenue</CardTitle>
                    <CardDescription>
                      Best performing product variants
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PieChart
                      data={variantAnalytics.topVariantsByRevenue.slice(0, 8).map(v => ({
                        name: `${v.productTitle} - ${v.variantName}`,
                        value: v.totalRevenue
                      })) as any}
                      index="name"
                      categories={["value"]}
                      colors={[
                        "#3b82f6",
                        "#22c55e",
                        "#eab308",
                        "#a855f7",
                        "#6366f1",
                        "#ef4444",
                        "#f97316",
                        "#06b6d4",
                      ]}
                      valueFormatter={(value) => `₦${value.toLocaleString()}`}
                      height={350}
                    />
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Top Variants by Units Sold</CardTitle>
                    <CardDescription>
                      Most popular product variants
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PieChart
                      data={variantAnalytics.topVariantsByQuantity.slice(0, 8).map(v => ({
                        name: `${v.productTitle} - ${v.variantName}`,
                        value: v.totalSold
                      })) as any}
                      index="name"
                      categories={["value"]}
                      colors={[
                        "#3b82f6",
                        "#22c55e",
                        "#eab308",
                        "#a855f7",
                        "#6366f1",
                        "#ef4444",
                        "#f97316",
                        "#06b6d4",
                      ]}
                      valueFormatter={(value) => `${value.toLocaleString()} units`}
                      height={350}
                    />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Variant Performance Details</CardTitle>
                  <CardDescription>
                    Detailed breakdown of variant sales and revenue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Variant</TableHead>
                          <TableHead className="text-right">Units Sold</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Avg. Price</TableHead>
                          <TableHead className="text-center">Performance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {variantAnalytics.topVariantsByRevenue.map((variant, index) => (
                          <TableRow key={`${variant.productTitle}-${variant.variantName}-${index}`}>
                            <TableCell className="font-medium">
                              {variant.productTitle}
                            </TableCell>
                            <TableCell>
                              {variant.variantName}
                            </TableCell>
                            <TableCell className="text-right">
                              {variant.totalSold}
                            </TableCell>
                            <TableCell className="text-right">
                              ₦{variant.totalRevenue.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              ₦{variant.averagePrice.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  variant.totalRevenue > 20000
                                    ? "default"
                                    : variant.totalRevenue > 5000
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {variant.totalRevenue > 20000
                                  ? "High"
                                  : variant.totalRevenue > 5000
                                    ? "Medium"
                                    : "Low"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  No Variants Found
                </CardTitle>
                <CardDescription>
                  No product variants have been created yet. Add variants to your products to see variant-specific analytics.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}