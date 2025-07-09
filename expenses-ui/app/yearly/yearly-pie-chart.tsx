"use client";

import { useState, useMemo } from "react";
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
  ChartConfig,
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

type PieChartEntry = {
  tag: string;
  amount: number;
  fill: string;
};

type TagAmount = {
  tag: string;
  amount: number;
};

type YearlyData = {
  year: number;
  amountByTag: TagAmount[];
};

type Props = {
  data: YearlyData[];
};

export default function YearlyLineChart({ data }: Props) {
  const years = data.map((dataForYear) => dataForYear.year);
  const latestYear =
    years.length == 0
      ? undefined
      : years.reduce((prev, cur) => {
          if (prev == undefined) {
            return cur;
          }
          return cur > prev ? cur : prev;
        });
  const [pieChartYear, setPieChartYear] = useState<number | undefined>(
    latestYear
  );
  const selectedYearData = data.find((v) => v.year === pieChartYear);
  const numColors = 5;
  const pieChartAllData: PieChartEntry[] =
    selectedYearData === undefined
      ? []
      : selectedYearData.amountByTag.map(({ tag, amount }, index) => {
          return {
            tag,
            amount,
            fill: `var(--chart-${(index % numColors) + 1})`,
          };
        });
  const pieTop4 = pieChartAllData.filter((_, index) => index < numColors - 1);
  const pieRemaining = pieChartAllData
    .filter((_, index) => index >= numColors - 1)
    .reduce(
      (acc, cur) => {
        return {
          tag: acc.tag,
          amount: acc.amount + cur.amount,
          fill: acc.fill,
        };
      },
      {
        tag: "others",
        amount: 0,
        fill: `var(--chart-${numColors})`,
      }
    );
  const pieChartData = pieTop4;
  pieChartData.push(pieRemaining);

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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tags Distribution</CardTitle>
        <CardDescription>Pie chart of tags for a selected year</CardDescription>
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
        <ChartContainer config={config}>
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
  );
}
