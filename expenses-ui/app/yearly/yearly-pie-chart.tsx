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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type PieChartEntry = {
  tag: string;
  amount: number;
  fill: string;
};

export type TagAmount = {
  tag: string;
  amount: number;
};

export type YearlyData = {
  year: number;
  amountByTag: TagAmount[];
};

type Props = {
  data: YearlyData[];
};

type MinMaxYears = {
  minYear: number | undefined;
  maxYear: number | undefined;
};

function minMaxFromYears(years: number[]): MinMaxYears {
  if (years.length == 0) {
    return {
      minYear: undefined,
      maxYear: undefined,
    };
  }
  return years.reduce(
    (prev, cur) => {
      return {
        minYear: prev.minYear < cur ? prev.minYear : cur,
        maxYear: prev.maxYear > cur ? prev.maxYear : cur,
      };
    },
    {
      minYear: years[0],
      maxYear: years[0],
    }
  );
}

function clamp(
  val: number | undefined,
  { minYear: min, maxYear: max }: MinMaxYears
): number | undefined {
  if (val === undefined || min === undefined || max === undefined) {
    return undefined;
  }
  if (val >= min && val <= max) {
    return val;
  }
  return max;
}

function YearSelector({
  years,
  selectedYear,
  onYearChange,
}: {
  years: number[];
  selectedYear: number | undefined;
  onYearChange: (year: number) => void;
}) {
  return (
    <Select
      onValueChange={(value) => onYearChange(parseInt(value))}
      value={selectedYear?.toString()}
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
  );
}

export default function YearlyPieChart({ data }: Props) {
  const years = data.map((dataForYear) => dataForYear.year);
  const { minYear, maxYear } = minMaxFromYears(years);
  const [pieChartYear, setPieChartYear] = useState<number | undefined>(maxYear);
  const selectedYear = clamp(pieChartYear, { minYear, maxYear });
  if (selectedYear !== undefined && selectedYear !== pieChartYear) {
    setPieChartYear(selectedYear);
  }
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
    <Tabs defaultValue="pie">
      <TabsList>
        <TabsTrigger value="pie">Pie Chart</TabsTrigger>
        <TabsTrigger value="table">Table</TabsTrigger>
      </TabsList>
      <TabsContent value="pie">
        <Card>
          <CardHeader>
            <CardTitle>Tags Distribution Chart</CardTitle>
            <CardDescription>
              Breakdown of tags for a selected year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <YearSelector
              years={years}
              selectedYear={pieChartYear}
              onYearChange={setPieChartYear}
            />
            <ChartContainer config={config}>
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={pieChartData}
                  dataKey="amount"
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
      </TabsContent>
      <TabsContent value="table">
        <Card>
          <CardHeader>
            <CardTitle>Tags Distribution Table</CardTitle>
            <CardDescription>
              Breakdown of tags for a selected year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <YearSelector
              years={years}
              selectedYear={pieChartYear}
              onYearChange={setPieChartYear}
            />
            TODO: Display table here!
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
