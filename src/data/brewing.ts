export interface BrewMethod {
  id: "french-press" | "pour-over" | "filter";
  name: string;
  line: string;
  description: string;
  bestWith: string[];
  guidance: { label: string; value: string }[];
}

/** General starting points. Not recipes, and not rules. */
export const brewMethods: BrewMethod[] = [
  {
    id: "french-press",
    name: "French press",
    line: "More of the bean stays in the cup.",
    description: "Immersion, a coarse grind, and four quiet minutes. The fullest of the three methods.",
    bestWith: ["dark-truth", "bitter-truth"],
    guidance: [
      { label: "Grind", value: "Coarse" },
      { label: "Ratio", value: "1 : 15" },
      { label: "Time", value: "4 min" },
      { label: "Water", value: "Just off the boil" },
    ],
  },
  {
    id: "pour-over",
    name: "Pour-over",
    line: "The clearest way to taste it.",
    description: "Water through a paper filter. Less body, more of whatever the bean actually smells like.",
    bestWith: ["honest-truth", "bitter-truth"],
    guidance: [
      { label: "Grind", value: "Medium-fine" },
      { label: "Ratio", value: "1 : 16" },
      { label: "Time", value: "2–3 min" },
      { label: "Water", value: "Just off the boil" },
    ],
  },
  {
    id: "filter",
    name: "Filter",
    line: "The everyday cup.",
    description: "A simple filter brew — the method most of these coffees will actually be drunk as.",
    bestWith: ["honest-truth", "dark-truth", "bitter-truth"],
    guidance: [
      { label: "Grind", value: "Medium" },
      { label: "Ratio", value: "1 : 15" },
      { label: "Time", value: "4–5 min" },
      { label: "Water", value: "Just off the boil" },
    ],
  },
];
