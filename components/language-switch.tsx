import { LANGUAGES } from "@/constants/global";

export const LanguageSwitch = ({ lang }: { lang: string }) => (
  <nav aria-label="Language" className="text-meta flex gap-2">
    {LANGUAGES.map((l) => (
      <a
        key={l}
        href={`/${l}`}
        hrefLang={l}
        aria-current={l === lang ? "page" : undefined}
        className={
          l === lang
            ? "text-pink underline underline-offset-4"
            : "text-subtext0 hover:text-text no-underline"
        }
      >
        {l.toUpperCase()}
      </a>
    ))}
  </nav>
);
