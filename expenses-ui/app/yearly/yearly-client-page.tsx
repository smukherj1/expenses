"use client";

import { TxnOverviewsByYear } from "@/lib/transactions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState, useEffect } from "react";
import YearlyLineChart from "./yearly-line-chart";
import YearTagBreakdown from "./year-tag-breakdown";

type YearlyData = {
  year: number;
  amountByTag: Map<string, number>;
};

function toPieChartData(
  yearlyMap: Map<number, YearlyData>,
  filteredYears: number[]
) {
  const pieChartData: {
    year: number;
    amountByTag: { tag: string; amount: number }[];
  }[] = [];
  filteredYears.forEach((year) => {
    if (!yearlyMap.has(year)) {
      return;
    }
    const yearData = yearlyMap.get(year)!;
    const amountByTag: { tag: string; amount: number }[] = [];
    yearData.amountByTag.forEach((amount, tag) => {
      amountByTag.push({ tag, amount });
    });
    pieChartData.push({ year, amountByTag });
  });
  return pieChartData;
}

export default function YearlyClientPage({
  data,
}: {
  data: TxnOverviewsByYear;
}) {
  const [startYear, setStartYear] = useState<number | undefined>();
  const [endYear, setEndYear] = useState<number | undefined>();

  // Memoize the base computed values from props
  const { years, yearlyMap } = useMemo(() => {
    const yearlyMap: Map<number, YearlyData> = new Map();
    data.forEach((item) => {
      if (!yearlyMap.has(item.year)) {
        yearlyMap.set(item.year, { year: item.year, amountByTag: new Map() });
      }
      const yearData = yearlyMap.get(item.year)!;
      yearData.amountByTag.set(item.tag, parseFloat(item.amount));
    });
    const allYears = Array.from(yearlyMap.keys()).sort();
    return { years: allYears, yearlyMap };
  }, [data]);

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

    const pieChartData = toPieChartData(yearlyMap, filteredYears);
    return { lineChartData, pieChartData };
  }, [startYear, endYear, years, yearlyMap]);

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
        <YearlyLineChart data={lineChartData} />
        <YearTagBreakdown data={pieChartData} />
      </div>
    </div>
  );
}
