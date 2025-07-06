"use client";

import { TxnOverviewsByYear } from "@/lib/transactions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Label, Pie, PieChart } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState } from "react";
import { LineChart, CartesianGrid, XAxis, YAxis, Line } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";

type YearlyData = {
  year: number;
  [key: string]: number | string;
};

export default function YearlyClientPage({
  data,
}: {
  data: TxnOverviewsByYear;
}) {
  const [startYear, setStartYear] = useState<number | undefined>();
  const [endYear, setEndYear] = useState<number | undefined>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [pieChartYear, setPieChartYear] = useState<number | undefined>();

  const { lineChartData, pieChartData, years, tags } = useMemo(() => {
    const yearlyMap: Map<number, YearlyData> = new Map();
    const tagsSet: Set<string> = new Set();
    data.forEach((item) => {
      tagsSet.add(item.tag);
      if (!yearlyMap.has(item.year)) {
        yearlyMap.set(item.year, { year: item.year });
      }
      const yearData = yearlyMap.get(item.year)!;
      yearData[item.tag] = parseFloat(item.amount);
    });

    const allYears = Array.from(yearlyMap.keys()).sort();
    const allTags = Array.from(tagsSet);

    if (selectedTags.length === 0) {
      setSelectedTags(allTags);
    }

    if (pieChartYear === undefined && allYears.length > 0) {
      setPieChartYear(allYears[allYears.length - 1]);
    }

    const filteredYears = allYears.filter((year) => {
      if (startYear && year < startYear) return false;
      if (endYear && year > endYear) return false;
      return true;
    });

    const lineChartData = filteredYears.map((year) => {
      const yearData = yearlyMap.get(year)!;
      const total = selectedTags.reduce((acc, tag) => {
        return acc + ((yearData[tag] as number) || 0);
      }, 0);
      return { year, total };
    });

    const pieChartData =
      pieChartYear && yearlyMap.has(pieChartYear)
        ? Object.entries(yearlyMap.get(pieChartYear)!)
            .filter(
              ([key, value]) => key !== "year" && typeof value === "number"
            )
            .map(([name, value]) => ({ name, value: value as number }))
        : [];

    return {
      lineChartData,
      pieChartData,
      years: allYears,
      tags: allTags,
    };
  }, [data, startYear, endYear, selectedTags, pieChartYear]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Yearly Transactions</CardTitle>
          <CardDescription>Line chart of transactions by year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select onValueChange={(value) => setStartYear(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Start Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(value) => setEndYear(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="End Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedTags.length === tags.length}
                onCheckedChange={(checked) =>
                  setSelectedTags(checked ? tags : [])
                }
              />
              <span>All/None</span>
            </div>
            {tags.map((tag) => (
              <div key={tag} className="flex items-center gap-2">
                <Checkbox
                  checked={selectedTags.includes(tag)}
                  onCheckedChange={(checked) => {
                    setSelectedTags((prev) =>
                      checked ? [...prev, tag] : prev.filter((t) => t !== tag)
                    );
                  }}
                />
                <span>{tag}</span>
              </div>
            ))}
          </div>
          <ChartContainer config={{}}>
            <LineChart data={lineChartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="year" />
              <YAxis />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Line
                dataKey="total"
                type="monotone"
                stroke="hsl(var(--primary))"
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tags Distribution</CardTitle>
          <CardDescription>
            Pie chart of tags for a selected year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            onValueChange={(value) => setPieChartYear(parseInt(value))}
            defaultValue={pieChartYear?.toString()}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ChartContainer config={{}}>
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={pieChartData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {pieChartData
                              .reduce((acc, curr) => acc + curr.value, 0)
                              .toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground"
                          >
                            Total
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
("");
