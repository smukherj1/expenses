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
import YearlyLineChart from "./yearly-line-chart";

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
      const amount = yearData.amountByTag
        .entries()
        .map(([_, amount]) => amount)
        .reduce((prev, cur) => prev + cur, 0);
      return { year, amount };
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
  }, [startYear, endYear, pieChartYear, years, yearlyMap]);

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
    <div className="flex flex-col">
      <Card>
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
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Yearly Transactions</CardTitle>
            <CardDescription>
              Line chart of transactions by year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <YearlyLineChart data={lineChartData} />
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
    </div>
  );
}
