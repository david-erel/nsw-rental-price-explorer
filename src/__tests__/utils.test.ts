import { describe, it, expect } from "vitest";
import {
  median,
  formatCurrency,
  groupLabel,
  toNum,
  getPostcodeRegion,
  formatPostcodeRegionKey,
  groupStats,
  POSTCODE_REGIONS,
} from "../utils";

describe("median", () => {
  it("returns the middle value for odd-length arrays", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([5])).toBe(5);
    expect(median([10, 20, 30, 40, 50])).toBe(30);
  });

  it("returns the average of two middle values for even-length arrays", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([10, 20])).toBe(15);
    expect(median([1, 3, 5, 7])).toBe(4);
  });

  it("does not mutate the input array", () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });

  it("handles single element", () => {
    expect(median([42])).toBe(42);
  });

  it("handles already sorted arrays", () => {
    expect(median([1, 2, 3])).toBe(2);
  });

  it("handles negative numbers", () => {
    expect(median([-5, -1, -3])).toBe(-3);
  });
});

describe("formatCurrency", () => {
  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats whole numbers without decimals", () => {
    expect(formatCurrency(500)).toBe("$500");
  });

  it("formats large numbers with comma separators", () => {
    const result = formatCurrency(1500);
    expect(result).toMatch(/^\$1[,.]?500$/);
  });

  it("rounds decimals to whole numbers", () => {
    const result = formatCurrency(499.7);
    expect(result).toBe("$500");
  });

  it("formats negative numbers", () => {
    expect(formatCurrency(-250)).toBe("$-250");
  });
});

describe("groupLabel", () => {
  it("maps dwelling type codes to labels", () => {
    expect(groupLabel("dwellingType", "F")).toBe("Flat / Unit");
    expect(groupLabel("dwellingType", "H")).toBe("House");
    expect(groupLabel("dwellingType", "T")).toBe("Terrace / Townhouse");
  });

  it("returns the key for unknown dwelling types", () => {
    expect(groupLabel("dwellingType", "X")).toBe("X");
  });

  it("maps bedroom counts to labels", () => {
    expect(groupLabel("bedrooms", "0")).toBe("Studio");
    expect(groupLabel("bedrooms", "1")).toBe("1 Bed");
    expect(groupLabel("bedrooms", "3")).toBe("3 Bed");
  });

  it("maps null bedrooms to Unknown", () => {
    expect(groupLabel("bedrooms", "null")).toBe("Unknown");
  });

  it("returns key as-is for other group fields", () => {
    expect(groupLabel("postcode", "2000")).toBe("2000");
    expect(groupLabel("none", "anything")).toBe("anything");
  });
});

describe("toNum", () => {
  it("returns numbers as-is", () => {
    expect(toNum(42)).toBe(42);
    expect(toNum(0)).toBe(0);
    expect(toNum(-5.5)).toBe(-5.5);
  });

  it("parses numeric strings", () => {
    expect(toNum("123")).toBe(123);
    expect(toNum("45.67")).toBe(45.67);
  });

  it("strips dollar signs", () => {
    expect(toNum("$500")).toBe(500);
  });

  it("strips commas", () => {
    expect(toNum("1,500")).toBe(1500);
  });

  it("strips whitespace", () => {
    expect(toNum(" 250 ")).toBe(250);
  });

  it("handles combined formatting", () => {
    expect(toNum("$1,500.50")).toBe(1500.5);
  });

  it("returns 0 for non-numeric values", () => {
    expect(toNum("abc")).toBe(0);
    expect(toNum("")).toBe(0);
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
  });
});

describe("getPostcodeRegion", () => {
  it("returns the correct region for CBD postcodes", () => {
    const region = getPostcodeRegion(2000);
    expect(region).toBeDefined();
    expect(region!.name).toBe("CBD · Kings Cross");
  });

  it("returns the correct region for boundary postcodes", () => {
    expect(getPostcodeRegion(2019)!.name).toBe("CBD · Kings Cross");
    expect(getPostcodeRegion(2020)!.name).toBe("Bondi · Eastern Suburbs");
  });

  it("returns undefined for postcodes outside all regions", () => {
    expect(getPostcodeRegion(1000)).toBeUndefined();
    expect(getPostcodeRegion(9999)).toBeUndefined();
  });

  it("covers the full range of defined regions", () => {
    for (const region of POSTCODE_REGIONS) {
      expect(getPostcodeRegion(region.lo)?.name).toBe(region.name);
      expect(getPostcodeRegion(region.hi)?.name).toBe(region.name);
    }
  });
});

describe("formatPostcodeRegionKey", () => {
  it("formats a known region key", () => {
    const result = formatPostcodeRegionKey("2000-2019");
    expect(result).toContain("2000");
    expect(result).toContain("2019");
    expect(result).toContain("CBD · Kings Cross");
  });

  it("handles unknown region keys gracefully", () => {
    const result = formatPostcodeRegionKey("9000-9099");
    expect(result).toContain("9000");
    expect(result).toContain("9099");
  });
});

describe("groupStats", () => {
  it("computes avg and median for a set of bonds", () => {
    const bonds = [
      { lodgementDate: "", postcode: 2000, dwellingType: "F", bedrooms: 2, weeklyRent: 400 },
      { lodgementDate: "", postcode: 2000, dwellingType: "F", bedrooms: 2, weeklyRent: 600 },
      { lodgementDate: "", postcode: 2000, dwellingType: "F", bedrooms: 2, weeklyRent: 800 },
    ];
    const stats = groupStats(bonds);
    expect(stats.avg).toBe(600);
    expect(stats.median).toBe(600);
  });

  it("computes correct median for even-count groups", () => {
    const bonds = [
      { lodgementDate: "", postcode: 2000, dwellingType: "F", bedrooms: 2, weeklyRent: 300 },
      { lodgementDate: "", postcode: 2000, dwellingType: "F", bedrooms: 2, weeklyRent: 500 },
    ];
    const stats = groupStats(bonds);
    expect(stats.avg).toBe(400);
    expect(stats.median).toBe(400);
  });

  it("handles single bond", () => {
    const bonds = [{ lodgementDate: "", postcode: 2000, dwellingType: "F", bedrooms: 2, weeklyRent: 750 }];
    const stats = groupStats(bonds);
    expect(stats.avg).toBe(750);
    expect(stats.median).toBe(750);
  });
});
