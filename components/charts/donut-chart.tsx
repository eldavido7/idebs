"use client"

import { useEffect, useState } from "react"
import { DonutChart as TremorDonutChart } from "@tremor/react"
import { Skeleton } from "@/components/ui/skeleton"

export default function DonutChart({
  data = [],
  index = "name",
  categories = ["value"],
  colors = ["blue", "amber", "emerald", "indigo", "red"],
  valueFormatter = (value: number) => `${value}`,
  height = 350,
  className = "",
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <Skeleton className="h-[350px] w-full" />
  }

  const category = categories[0]

  return (
    <div style={{ height: `${height}px` }} className={`w-full ${className}`}>
      <TremorDonutChart
        data={data}
        index={index}
        category={category}
        colors={colors}
        valueFormatter={valueFormatter}
        showAnimation={true}
        variant="pie" // This makes it a full pie chart instead of a donut
        className="h-full"
      />
    </div>
  )
}
