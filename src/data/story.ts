import { assets } from "@/config/assets";

export const storyIntro = "Coffee has collected a lot of theatre. We’d like to hand some of it back.";

export const principles = [
  {
    title: "Say what it is",
    text: "Three coffees, each clear about the beans in the bag. If we haven’t confirmed a fact, we don’t invent one.",
  },
  {
    title: "Three personalities",
    text: "Different beans make different cups. We don’t pretend one of them is right for everyone.",
  },
  {
    title: "Skip the costume",
    text: "No mystique, no lecture, no tasting notes written to sound expensive. The cup can speak for itself.",
  },
  {
    title: "Nothing hidden",
    text: "The blend is on the bag. The things we don’t know yet stay marked as such.",
  },
];

export const chapters = [
  {
    id: "robusta",
    product: "dark-truth",
    numeral: "I",
    eyebrow: "Robusta",
    title: ["The heavier", "bean."],
    body: "Robusta brings body, bitterness and caffeine. It is often blended away. Dark Truth is 100% of it, so you can taste what it actually is.",
    image: assets.story.robusta,
  },
  {
    id: "arabica",
    product: "honest-truth",
    numeral: "II",
    eyebrow: "Arabica",
    title: ["The quieter", "bean."],
    body: "Arabica is the fragrant one — lighter in the cup, higher in aroma, easier to drink black. Honest Truth is this bean on its own.",
    image: assets.story.arabica,
  },
  {
    id: "blend",
    product: "bitter-truth",
    numeral: "III",
    eyebrow: "The blend",
    title: ["Both, on", "purpose."],
    body: "A blend is not a compromise if you say the ratio. Bitter Truth is 70% Arabica and 30% Robusta — aroma from one, weight from the other.",
    image: assets.story.blend,
  },
];
