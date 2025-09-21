"use client"

import { useEffect, useState } from "react"
import { BarChart as TremorBarChart } from "@tremor/react"
import { Skeleton } from "@/components/ui/skeleton"

export default function BarChart({
  data = [],
  index = "",
  categories = [],
  colors = ["emerald"],
  valueFormatter = (value: number) => `₦${value}`,
  yAxisWidth = 60,
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

  return (
    <div style={{ height: `${height}px` }} className={`w-full ${className}`}>
      <TremorBarChart
        data={data}
        index={index}
        categories={categories}
        colors={colors}
        valueFormatter={valueFormatter}
        yAxisWidth={yAxisWidth}
        showLegend={false}
        showGridLines={true}
        showAnimation={true}
        className="h-full"
      />
    </div>
  )
}
