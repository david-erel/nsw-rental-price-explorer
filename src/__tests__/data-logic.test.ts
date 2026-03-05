import { describe, it, expect } from "vitest";
import { filterBonds, sortBonds, groupBonds, RENT_ABS_MAX } from "../utils";
import type { RentalBond, Filters } from "../types";

const makeBond = (overrides: Partial<RentalBond> = {}): RentalBond => ({
  lodgementDate: "01/01/2025",
  postcode: 2000,
  dwellingType: "F",
  bedrooms: 2,
  weeklyRent: 500,
  ...overrides,
});

const sampleData: RentalBond[] = [
  makeBond({ postcode: 2000, dwellingType: "F", bedrooms: 1, weeklyRent: 400 }),
  makeBond({ postcode: 2010, dwellingType: "H", bedrooms: 3, weeklyRent: 800 }),
  makeBond({ postcode: 2020, dwellingType: "T", bedrooms: 2, weeklyRent: 600 }),
  makeBond({ postcode: 2030, dwellingType: "F", bedrooms: null, weeklyRent: 350 }),
  makeBond({ postcode: 2040, dwellingType: "H", bedrooms: 5, weeklyRent: 1200 }),
  makeBond({ postcode: 2050, dwellingType: "F", bedrooms: 0, weeklyRent: 300 }),
];

const defaultFilters: Filters = {
  dwellingTypes: [],
  bedrooms: [],
  postcodes: [],
  rentMin: 0,
  rentMax: RENT_ABS_MAX,
};

describe("filterBonds", () => {
  it("returns all data when no filters are active", () => {
    const result = filterBonds(sampleData, defaultFilters);
    expect(result).toHaveLength(sampleData.length);
  });

  it("filters by dwelling type", () => {
    const result = filterBonds(sampleData, { ...defaultFilters, dwellingTypes: ["F"] });
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.dwellingType === "F")).toBe(true);
  });

  it("filters by multiple dwelling types", () => {
    const result = filterBonds(sampleData, { ...defaultFilters, dwellingTypes: ["F", "H"] });
    expect(result).toHaveLength(5);
  });

  it("filters by bedrooms", () => {
    const result = filterBonds(sampleData, { ...defaultFilters, bedrooms: [2] });
    expect(result).toHaveLength(1);
    expect(result[0].bedrooms).toBe(2);
  });

  it("excludes null bedrooms when bedroom filter is active", () => {
    const result = filterBonds(sampleData, { ...defaultFilters, bedrooms: [1, 2, 3] });
    const nullBeds = result.filter((r) => r.bedrooms === null);
    expect(nullBeds).toHaveLength(0);
  });

  it("treats 5+ as >= 5 bedrooms", () => {
    const result = filterBonds(sampleData, { ...defaultFilters, bedrooms: [5] });
    expect(result).toHaveLength(1);
    expect(result[0].bedrooms).toBe(5);
  });

  it("filters by postcodes", () => {
    const result = filterBonds(sampleData, { ...defaultFilters, postcodes: [2000, 2020] });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.postcode)).toEqual([2000, 2020]);
  });

  it("filters by minimum rent", () => {
    const result = filterBonds(sampleData, { ...defaultFilters, rentMin: 500 });
    expect(result.every((r) => r.weeklyRent >= 500)).toBe(true);
    expect(result).toHaveLength(3);
  });

  it("filters by maximum rent", () => {
    const result = filterBonds(sampleData, { ...defaultFilters, rentMax: 500 });
    expect(result.every((r) => r.weeklyRent <= 500)).toBe(true);
    expect(result).toHaveLength(3);
  });

  it("does not apply max rent filter when at RENT_ABS_MAX", () => {
    const highRentBond = makeBond({ weeklyRent: 5000 });
    const data = [...sampleData, highRentBond];
    const result = filterBonds(data, { ...defaultFilters, rentMax: RENT_ABS_MAX });
    expect(result).toHaveLength(data.length);
  });

  it("combines multiple filters", () => {
    const result = filterBonds(sampleData, {
      dwellingTypes: ["F"],
      bedrooms: [1],
      postcodes: [],
      rentMin: 0,
      rentMax: RENT_ABS_MAX,
    });
    expect(result).toHaveLength(1);
    expect(result[0].weeklyRent).toBe(400);
  });

  it("returns empty array when nothing matches", () => {
    const result = filterBonds(sampleData, { ...defaultFilters, postcodes: [9999] });
    expect(result).toHaveLength(0);
  });
});

describe("sortBonds", () => {
  it("sorts by weeklyRent ascending", () => {
    const result = sortBonds(sampleData, "weeklyRent", "asc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i].weeklyRent).toBeGreaterThanOrEqual(result[i - 1].weeklyRent);
    }
  });

  it("sorts by weeklyRent descending", () => {
    const result = sortBonds(sampleData, "weeklyRent", "desc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i].weeklyRent).toBeLessThanOrEqual(result[i - 1].weeklyRent);
    }
  });

  it("sorts by postcode ascending", () => {
    const result = sortBonds(sampleData, "postcode", "asc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i].postcode).toBeGreaterThanOrEqual(result[i - 1].postcode);
    }
  });

  it("sorts by dwellingType alphabetically", () => {
    const result = sortBonds(sampleData, "dwellingType", "asc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i].dwellingType.localeCompare(result[i - 1].dwellingType)).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles null bedrooms (sorted to end in ascending)", () => {
    const result = sortBonds(sampleData, "bedrooms", "asc");
    const lastItem = result[result.length - 1];
    expect(lastItem.bedrooms).toBeNull();
  });

  it("does not mutate the input array", () => {
    const original = [...sampleData];
    sortBonds(sampleData, "weeklyRent", "asc");
    expect(sampleData).toEqual(original);
  });
});

describe("groupBonds", () => {
  it("returns null when groupBy is none", () => {
    expect(groupBonds(sampleData, "none")).toBeNull();
  });

  it("groups by dwellingType", () => {
    const result = groupBonds(sampleData, "dwellingType");
    expect(result).not.toBeNull();
    const keys = result!.map(([k]) => k);
    expect(keys).toContain("F");
    expect(keys).toContain("H");
    expect(keys).toContain("T");
  });

  it("groups by bedrooms", () => {
    const result = groupBonds(sampleData, "bedrooms");
    expect(result).not.toBeNull();
    const keys = result!.map(([k]) => k);
    expect(keys).toContain("1");
    expect(keys).toContain("2");
    expect(keys).toContain("null");
  });

  it("sorts groups alphabetically with numeric awareness", () => {
    const result = groupBonds(sampleData, "bedrooms");
    expect(result).not.toBeNull();
    const keys = result!.map(([k]) => k);
    const numericKeys = keys.filter((k) => k !== "null").map(Number);
    for (let i = 1; i < numericKeys.length; i++) {
      expect(numericKeys[i]).toBeGreaterThan(numericKeys[i - 1]);
    }
  });

  it("preserves all records across groups", () => {
    const result = groupBonds(sampleData, "dwellingType");
    const totalRecords = result!.reduce((sum, [, items]) => sum + items.length, 0);
    expect(totalRecords).toBe(sampleData.length);
  });

  it("groups by postcode", () => {
    const result = groupBonds(sampleData, "postcode");
    expect(result).not.toBeNull();
    expect(result!.length).toBe(sampleData.length);
  });
});
