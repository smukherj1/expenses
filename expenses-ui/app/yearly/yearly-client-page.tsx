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
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Pie, PieChart } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState, useEffect } from "react";
import { LineChart, CartesianGrid, XAxis, YAxis, Line, Cell } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";

type YearlyData = {
  year: number;
  amountByTag: Map<string, number>;
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

  // Memoize the base computed values from props
  const { years, tags, yearlyMap } = useMemo(() => {
    const yearlyMap: Map<number, YearlyData> = new Map();
    const tagsSet: Set<string> = new Set();
    data.forEach((item) => {
      tagsSet.add(item.tag);
      if (!yearlyMap.has(item.year)) {
        yearlyMap.set(item.year, { year: item.year, amountByTag: new Map() });
      }
      const yearData = yearlyMap.get(item.year)!;
      yearData.amountByTag.set(item.tag, parseFloat(item.amount));
    });
    const allYears = Array.from(yearlyMap.keys()).sort();
    const allTags = Array.from(tagsSet);
    return { years: allYears, tags: allTags, yearlyMap };
  }, [data]);

  // Use useEffect for side-effects like initializing state
  useEffect(() => {
    // Set all tags as selected by default when the component mounts or tags change
    if (tags.length > 0) {
      setSelectedTags(tags);
    }
    // Set the pie chart to the most recent year by default
    if (pieChartYear === undefined && years.length > 0) {
      setPieChartYear(years[years.length - 1]);
    }
  }, [tags, years]);

  // Memoize the derived chart data based on state
  const { lineChartData, pieChartData } = useMemo(() => {
    const filteredYears = years.filter((year) => {
      if (startYear && year < startYear) return false;
      if (endYear && year > endYear) return false;
      return true;
    });

    const lineChartData = filteredYears.map((year) => {
      const yearData = yearlyMap.get(year)!;
      const total = selectedTags.reduce((acc, tag) => {
        return acc + ((yearData.amountByTag.get(tag) as number) || 0);
      }, 0);
      return { year, total };
    });

    const pieChartAllData =
      pieChartYear && yearlyMap.has(pieChartYear)
        ? Array.from(yearlyMap.get(pieChartYear)!.amountByTag.entries())
            .map(([tag, amount], index) => ({
              tag: tag,
              value: amount as number,
              // Cycle through the 5 available chart colors from global.css
              fill: `var(--chart-${(index % 5) + 1})`,
            }))
            .sort((a, b) => b.value - a.value)
        : [];
    const pieTop4 = pieChartAllData.filter((_, index) => index < 4);
    const pieRemaining = pieChartAllData
      .filter((_, index) => index >= 4)
      .reduce(
        (acc, cur) => {
          return {
            tag: acc.tag,
            value: acc.value + cur.value,
            fill: acc.fill,
          };
        },
        {
          tag: "others",
          value: 0,
          fill: "var(--chart-5)",
        }
      );
    const pieChartData = pieTop4;
    pieChartData.push(pieRemaining);
    return { lineChartData, pieChartData };
  }, [startYear, endYear, selectedTags, pieChartYear, years, yearlyMap]);

  const pieChartConfig = useMemo(() => {
    type ConfigData = {
      label: string;
      color: string;
    };
    const config: { [key: string]: ConfigData } = {} satisfies ChartConfig;
    pieChartData.forEach(({ tag, fill }, index) => {
      config[tag] = {
        label: tag,
        color: fill,
      };
    });
    return config;
  }, [tags, pieChartData]) satisfies ChartConfig;

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
            <LineChart
              data={lineChartData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="year"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.toString()}
              />
              <YAxis />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Line
                dataKey="total"
                type="monotone"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={true}
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
            value={pieChartYear?.toString()} // Controlled component
          >
            <SelectTrigger className="mb-4">
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
          <ChartContainer config={pieChartConfig}>
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={pieChartData}
                dataKey="value"
                nameKey="tag"
                innerRadius={60}
              />
              <ChartLegend
                content={<ChartLegendContent nameKey="tag" payload={{}} />}
                className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
              />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
