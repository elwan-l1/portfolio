import { type CardContent, renderCard } from "@/lib/card-svg";

// renderCard escapes every piece of text, and inline the svg uses the font the page already loaded
export const Preview = ({ card }: { card: CardContent }) => (
  <div
    className="[&_svg]:block [&_svg]:h-auto [&_svg]:max-w-full"
    dangerouslySetInnerHTML={{ __html: renderCard(card) }}
  />
);
