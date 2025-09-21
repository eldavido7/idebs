"use client"

import { useEffect, useState } from "react"
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

export default function PieChart({
  data = [],
  index = "name",
  categories = ["value"],
  colors = ["#3b82f6", "#22c55e", "#eab308", "#a855f7", "#6366f1"],
  valueFormatter = (value: number) => `${value}`,
  height = 350,
  className = "",
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-[350px] w-full bg-muted/20 animate-pulse rounded-md"></div>
  }

  const category = categories[0]

  // Make sure we have data to display
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] w-full bg-muted/10 rounded-md">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    )
  }

  return (
    <div style={{ width: "100%", height: `${height}px` }} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            outerRadius={120}
            fill="#8884d8"
            dataKey={category}
            nameKey={index}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => valueFormatter(value as number)}
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "0.375rem",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
          />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}
