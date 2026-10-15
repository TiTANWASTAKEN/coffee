import { assets, type ImageAsset } from "@/config/assets";

export type JournalBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; items: string[] };

export interface JournalArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingTime: string;
  date: string | null;
  cover: ImageAsset;
  body: JournalBlock[];
}

export const journal: JournalArticle[] = [
  {
    slug: "how-to-choose-your-coffee",
    title: "How to choose your coffee",
    excerpt: "Skip the jargon. Start with how you actually like to drink it.",
    category: "Guide",
    readingTime: "3 min read",
    date: "2026-03-02",
    cover: assets.journal["how-to-choose-your-coffee"],
    body: [
      {
        type: "p",
        text: "Most coffee advice starts with words that don’t help: origin, process, score. A more useful question is what you want the cup to feel like.",
      },
      {
        type: "h2",
        text: "Three honest questions",
      },
      {
        type: "list",
        items: [
          "Do you want it light and fragrant, or heavy?",
          "Do you drink it black, or with milk?",
          "Is this an everyday cup, or one you sit with?",
        ],
      },
      {
        type: "p",
        text: "If you want aroma and a lighter cup, start with Arabica. If you want weight, bitterness and a cup that stands up in milk, start with Robusta. If you want both and don’t want to choose, a stated blend is the point of a blend.",
      },
      {
        type: "quote",
        text: "Choose by personality, not by jargon.",
      },
      {
        type: "p",
        text: "That’s the whole method. The rest — grind, ratio, time — you can adjust once you know which cup you’re trying to make.",
      },
    ],
  },
  {
    slug: "arabica-vs-robusta",
    title: "Arabica and Robusta",
    excerpt: "Two species, two cups. Neither one is a moral position.",
    category: "Beans",
    readingTime: "4 min read",
    date: "2026-03-09",
    cover: assets.journal["arabica-vs-robusta"],
    body: [
      {
        type: "p",
        text: "Arabica and Robusta are different species of coffee. They don’t taste like versions of each other, and treating one as the “real” coffee is how a lot of bad labelling starts.",
      },
      {
        type: "h2",
        text: "What actually changes in the cup",
      },
      {
        type: "list",
        items: [
          "Arabica tends to be more aromatic, lighter in body, and easier to drink black.",
          "Robusta tends to be heavier, more bitter, and higher in caffeine.",
          "Robusta holds up better once you add milk. Arabica is easier to lose in it.",
        ],
      },
      {
        type: "p",
        text: "Neither fact makes one of them better. It makes them different. A bag should say which one you’re buying — or, if it’s both, in what proportion.",
      },
      {
        type: "quote",
        text: "Different beans make different cups.",
      },
    ],
  },
  {
    slug: "why-blends-exist",
    title: "Why blends exist",
    excerpt: "A blend is a decision. It should tell you the ratio.",
    category: "Beans",
    readingTime: "3 min read",
    date: "2026-03-16",
    cover: assets.journal["why-blends-exist"],
    body: [
      {
        type: "p",
        text: "A blend is not a way of hiding the cheaper bean. Used properly, it is a way of keeping two things you want: the aroma of one species and the body of the other.",
      },
      {
        type: "h2",
        text: "The only useful number",
      },
      {
        type: "p",
        text: "“House blend” tells you nothing. A percentage does. Seventy percent Arabica and thirty percent Robusta is a specific cup: still aromatic, with enough Robusta that the coffee doesn’t disappear into milk or go thin in a press.",
      },
      {
        type: "quote",
        text: "If a blend won’t say what it is, it isn’t being honest.",
      },
      {
        type: "p",
        text: "Single-origin storytelling is optional. The contents of the bag are not.",
      },
    ],
  },
  {
    slug: "how-to-brew-better-coffee",
    title: "How to brew better coffee",
    excerpt: "Four things move the cup more than any gadget: grind, ratio, time and water.",
    category: "Brewing",
    readingTime: "4 min read",
    date: "2026-03-23",
    cover: assets.journal["how-to-brew-better-coffee"],
    body: [
      {
        type: "p",
        text: "Better brewing is mostly repetition. Change one thing at a time, and only after the last cup was drinkable.",
      },
      {
        type: "h2",
        text: "A place to start",
      },
      {
        type: "list",
        items: [
          "Grind: coarse for a press, medium for a filter, medium-fine for a pour-over.",
          "Ratio: around 1 gram of coffee to 15 or 16 grams of water.",
          "Time: about four minutes in a press, two to three through a pour-over.",
          "Water: just off the boil is enough. You don’t need a thermometer to begin.",
        ],
      },
      {
        type: "p",
        text: "If the cup is sour, the grind is probably too coarse or the brew too short. If it’s harsh and dry, go a little coarser or use less coffee. Write down what you did. That’s the whole skill.",
      },
      {
        type: "quote",
        text: "Suggestions, not rules. Adjust until it tastes like the cup you wanted.",
      },
    ],
  },
];

export function getArticle(slug: string | undefined): JournalArticle | undefined {
  return journal.find((article) => article.slug === slug);
}
