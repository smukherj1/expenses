
import {
  FetchYearlyTransactionsOverview,
  TxnOverviewsByYear,
} from "@/lib/transactions";
import YearlyClientPage from "./yearly-client-page";

export default async function YearlyPage() {
  const data: TxnOverviewsByYear = await FetchYearlyTransactionsOverview();
  return <YearlyClientPage data={data} />;
}
