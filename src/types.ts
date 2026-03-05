export interface RentalBond {
  lodgementDate: string;
  postcode: number;
  dwellingType: string;
  bedrooms: number | null;
  weeklyRent: number;
}

export type GroupByField = "none" | "dwellingType" | "bedrooms" | "postcode";

export interface Filters {
  dwellingTypes: string[];
  bedrooms: number[];
  postcodes: number[];
  rentMin: number;
  rentMax: number;
}

export const DWELLING_TYPE_LABELS: Record<string, string> = {
  F: "Flat / Unit",
  H: "House",
  T: "Terrace / Townhouse",
  O: "Other",
  R: "Room",
  U: "Unknown",
};

export const BEDROOM_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Studio" },
  { value: 1, label: "1 Bedroom" },
  { value: 2, label: "2 Bedrooms" },
  { value: 3, label: "3 Bedrooms" },
  { value: 4, label: "4 Bedrooms" },
  { value: 5, label: "5+ Bedrooms" },
];

export type SortField = "lodgementDate" | "postcode" | "dwellingType" | "bedrooms" | "weeklyRent";
export type SortDir = "asc" | "desc";
export type ThemeMode = "light" | "dark" | "system";

export interface RentBin {
  label: string;
  fullLabel: string;
  midpoint: number;
  total: number;
  avg: number;
  byGroup: Record<string, number>;
  avgByGroup: Record<string, number>;
}

export interface MonthEntry {
  key: string;
  label: string;
  url: string;
}

const P = "/api/nsw-data/sites/default/files/noindex";

// Hardcoded because NSW Fair Trading uses irregular filenames, casing, separators, and folder paths.
export const MONTH_CATALOG: MonthEntry[] = [
  { key: "2026-01", label: "January 2026", url: `${P}/2026-02/rentalbond_lodgements_january_2026.xlsx` },
  { key: "2025-12", label: "December 2025", url: `${P}/2026-01/rentalbond_lodgements_december_2025.xlsx` },
  { key: "2025-11", label: "November 2025", url: `${P}/2025-12/rentalbond_lodgements_november_2025.xlsx` },
  { key: "2025-10", label: "October 2025", url: `${P}/2025-11/rentalbond_lodgements_october_2025.xlsx` },
  { key: "2025-09", label: "September 2025", url: `${P}/2025-10/rentalbond_lodgements_september25.xlsx` },
  { key: "2025-08", label: "August 2025", url: `${P}/2025-09/rentalbond_lodgements_august_2025.xlsx` },
  { key: "2025-07", label: "July 2025", url: `${P}/2025-08/rental-bond-lodgement-data-july-2025.xlsx` },
  { key: "2025-06", label: "June 2025", url: `${P}/2025-08/rentalbond_lodgements_june_2025_0.xlsx` },
  { key: "2025-05", label: "May 2025", url: `${P}/2025-06/rental-bond-lodgement-data-may-2025.xlsx` },
  { key: "2025-04", label: "April 2025", url: `${P}/2025-05/rental-bond-lodgements-april-2025.xlsx` },
  { key: "2025-03", label: "March 2025", url: `${P}/2025-04/rental-bond-lodgement-data-march-2025.xlsx` },
  { key: "2025-02", label: "February 2025", url: `${P}/2025-03/rental-bond-lodgement-data-february-2025.xlsx` },
  { key: "2025-01", label: "January 2025", url: `${P}/2025-02/rental-bond-lodgements-data-january-2025.xlsx` },
  { key: "2024-12", label: "December 2024", url: `${P}/2025-01/rental-bond-lodgements-december-2024.xlsx` },
  { key: "2024-11", label: "November 2024", url: `${P}/2024-12/rental-bond-lodgements-november-2024.xlsx` },
  { key: "2024-10", label: "October 2024", url: `${P}/2024-11/rental-bond-lodgements-october-2024.xlsx` },
  { key: "2024-09", label: "September 2024", url: `${P}/2024-10/rental-bond-lodgements-september-2024.xlsx` },
  { key: "2024-08", label: "August 2024", url: `${P}/2024-09/rental-bond-lodgements-august-2024.xlsx` },
  { key: "2024-07", label: "July 2024", url: `${P}/2024-08/rental-bond-lodgements-july-2024.xlsx` },
  { key: "2024-06", label: "June 2024", url: `${P}/2024-07/rental-bond-lodgements-june-2024.xlsx` },
  { key: "2024-05", label: "May 2024", url: `${P}/2024-06/rental-bond_lodgements_may_2024.xlsx` },
  { key: "2024-04", label: "April 2024", url: `${P}/2024-06/rental-bond-lodgements-april-2024.xlsx` },
  { key: "2024-03", label: "March 2024", url: `${P}/2024-05/rental-bond_lodgements_march_2024.xlsx` },
  { key: "2024-02", label: "February 2024", url: `${P}/2024-05/rental-bond-lodgements-february-2024.xlsx` },
  { key: "2024-01", label: "January 2024", url: `${P}/2024-05/rental-bond-lodgements-january-2024.xlsx` },
  { key: "2023-12", label: "December 2023", url: `${P}/2024-05/RentalBond_Lodgements_December_2023.xlsx` },
  { key: "2023-11", label: "November 2023", url: `${P}/2024-05/RentalBond_Lodgements_November_2023.xlsx` },
  { key: "2023-10", label: "October 2023", url: `${P}/2023-11/rental-bond_lodgements_october_2023.xlsx` },
  { key: "2023-09", label: "September 2023", url: `${P}/2023-11/RentalBond_Lodgements_September_2023.xlsx` },
  { key: "2023-08", label: "August 2023", url: `${P}/2023-11/rental_bond_lodgements_august_2023.xlsx` },
  { key: "2023-07", label: "July 2023", url: `${P}/2023-11/RentalBond_Lodgements_July_2023.xlsx` },
  { key: "2023-06", label: "June 2023", url: `${P}/2023-11/RentalBond_Lodgements_June_2023.xlsx` },
  { key: "2023-05", label: "May 2023", url: `${P}/2023-11/RentalBond_Lodgements_May_2023.xlsx` },
  { key: "2023-04", label: "April 2023", url: `${P}/2023-11/RentalBond_Lodgements_April_2023.xlsx` },
  { key: "2023-03", label: "March 2023", url: `${P}/2023-11/RentalBond_Lodgements_March_2023.xlsx` },
  { key: "2023-02", label: "February 2023", url: `${P}/2023-11/RentalBond_Lodgements_February_2023-2.xlsx` },
  { key: "2023-01", label: "January 2023", url: `${P}/2023-11/RentalBond_Lodgements_January_2023-3.xlsx` },
  { key: "2022-12", label: "December 2022", url: `${P}/2023-11/RentalBond_Lodgements_December_2022-3.xlsx` },
  { key: "2022-11", label: "November 2022", url: `${P}/2023-11/RentalBond_Lodgements_November_2022-3.xlsx` },
  { key: "2022-10", label: "October 2022", url: `${P}/2023-11/RentalBond_Lodgements_October_2022.xlsx` },
  { key: "2022-09", label: "September 2022", url: `${P}/2023-11/RentalBond_Lodgements_September_2022.xlsx` },
  { key: "2022-08", label: "August 2022", url: `${P}/2023-11/RentalBond_Lodgements_August_2022-3.xlsx` },
  { key: "2022-07", label: "July 2022", url: `${P}/2023-11/RentalBond_Lodgements_July_2022-2.xlsx` },
  { key: "2022-06", label: "June 2022", url: `${P}/2023-11/RentalBond_Lodgements_June_2022.xlsx` },
  { key: "2022-05", label: "May 2022", url: `${P}/2023-11/RentalBond_Lodgements_May_2022.xlsx` },
  { key: "2022-04", label: "April 2022", url: `${P}/2023-11/Rental-bond-lodgements-April-2022.xlsx` },
  { key: "2022-03", label: "March 2022", url: `${P}/2023-11/Rental-bond-lodgements-March-2022.xlsx` },
  { key: "2022-02", label: "February 2022", url: `${P}/2023-11/Rental-bond-lodgements-February-2022.xlsx` },
  { key: "2022-01", label: "January 2022", url: `${P}/2023-11/Rental-bond-lodgements-January-2022.xlsx` },
];
