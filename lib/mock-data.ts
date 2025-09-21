import type {
  SalesData,
  ProductPerformance,
} from "@/types"

// Mock Analytics Data
export const mockSalesData: SalesData[] = [
  { date: "2023-01", revenue: 12500, orders: 125 },
  { date: "2023-02", revenue: 15000, orders: 150 },
  { date: "2023-03", revenue: 18500, orders: 185 },
  { date: "2023-04", revenue: 22000, orders: 220 },
  { date: "2023-05", revenue: 20000, orders: 200 },
  { date: "2023-06", revenue: 25000, orders: 250 },
  { date: "2023-07", revenue: 30000, orders: 300 },
  { date: "2023-08", revenue: 27500, orders: 275 },
  { date: "2023-09", revenue: 32000, orders: 320 },
  { date: "2023-10", revenue: 35000, orders: 350 },
  { date: "2023-11", revenue: 40000, orders: 400 },
  { date: "2023-12", revenue: 50000, orders: 500 },
]

// Update the mockProductPerformance to match the new herbal medicine products
export const mockProductPerformance: ProductPerformance[] = [
  { id: "prod_01", title: "Immune Boost Herbal Tincture", sales: 350, revenue: 10496.5 },
  { id: "prod_02", title: "Digestive Health Capsules", sales: 200, revenue: 6998.0 },
  { id: "prod_03", title: "Sleep Support Herbal Tea", sales: 120, revenue: 2278.8 },
  { id: "prod_04", title: "Joint Support Salve", sales: 85, revenue: 2379.15 },
  { id: "prod_05", title: "Stress Relief Herbal Extract", sales: 175, revenue: 7523.25 },
]
