"use client"

import { useEffect, useState } from "react"
import { BarChart as TremorBarChart, LineChart as TremorLineChart, DonutChart as TremorDonutChart } from "@tremor/react"

// Wrapper for LineChart with client-side only rendering
export function DynamicLineChart(props: any) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="h-[350px] w-full bg-muted/20 animate-pulse rounded-md"></div>
  }

  return (
    <TremorLineChart
      data={props.data || []}
      index={props.index || ""}
      categories={props.categories || []}
      colors={props.colors || ["blue"]}
      valueFormatter={props.valueFormatter}
      yAxisWidth={props.yAxisWidth || 60}
      showLegend={false}
      className={props.className || ""}
      height={props.height || 350}
    />
  )
}

// Wrapper for BarChart with client-side only rendering
export function DynamicBarChart(props: any) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="h-[350px] w-full bg-muted/20 animate-pulse rounded-md"></div>
  }

  return (
    <TremorBarChart
      data={props.data || []}
      index={props.index || ""}
      categories={props.categories || []}
      colors={props.colors || ["blue"]}
      valueFormatter={props.valueFormatter}
      yAxisWidth={props.yAxisWidth || 60}
      showLegend={false}
      className={props.className || ""}
      height={props.height || 350}
    />
  )
}

// Wrapper for PieChart with client-side only rendering
export function DynamicPieChart(props: any) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="h-[350px] w-full bg-muted/20 animate-pulse rounded-md"></div>
  }

  return (
    <TremorDonutChart
      data={props.data || []}
      index={props.index || "name"}
      category={props.categories?.[0] || "value"}
      colors={props.colors || ["blue", "green", "amber", "purple", "indigo"]}
      valueFormatter={props.valueFormatter}
      showLabel={false}
      className={props.className || ""}
      height={props.height || 350}
    />
  )
}
