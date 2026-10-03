import { Fig, Tile } from "@/components/tile";
import { Title } from "@/components/title";
import { Letters } from "@/components/trail";
import { Uses } from "@/components/uses";

import type { HomeContent } from "@/lib/content";

import type { Dictionary, Locale } from "./dictionaries";
import { EMAIL, NAME } from "@/constants/global";
import { LOGO } from "@/constants/logo";

type PortfolioHomeProps = {
  lang: Locale;
  dictionary: Dictionary;
  content: HomeContent;
};

const ArtPlaceholder = () => <div aria-hidden className="min-h-40 flex-1" />;

const ROW =
  "grid w-full grid-cols-[4ch_minmax(0,1fr)] content-center gap-x-3 gap-y-0.5 py-2 text-subtext0 lg:grid-cols-[16ch_minmax(0,1fr)] lg:items-baseline lg:py-1 xl:grid-cols-[4ch_16ch_minmax(0,1fr)]";

const PortfolioHome = ({ lang, dictionary: t, content }: PortfolioHomeProps) => {
  const [mailbox, domain] = EMAIL.split("@");

  return (
    <main className="bg-base tall:lg:grid-rows-[minmax(min-content,0.8fr)_minmax(min-content,0.34fr)_minmax(min-content,1fr)] mx-auto grid w-full max-w-[1680px] grid-cols-1 gap-[3px] p-2 lg:h-dvh lg:grid-cols-12 lg:grid-rows-[minmax(min-content,0.5fr)_minmax(min-content,0.5fr)_minmax(min-content,1fr)]">
      {/* who */}
      <Tile className="bg-mantle tall:gap-5 flex flex-col justify-between gap-3 lg:col-span-4 lg:row-span-2">
        <div>
          <h1 className="text-head text-text m-0 font-bold">{NAME}</h1>
          <p className="text-lead text-text m-0 mt-4 leading-tight font-bold tracking-[-0.02em]">
            {t.role}
          </p>
          <p className="text-meta text-subtext0 m-0 mt-1">{t.affiliation}</p>
        </div>
        <div className="text-body text-subtext1 flex max-w-[46ch] flex-col gap-3 leading-relaxed">
          {t.bio.map((paragraph, i) => (
            <p key={paragraph} className={`m-0 ${i === 0 ? "text-text" : ""}`}>
              {paragraph}
            </p>
          ))}
        </div>
      </Tile>

      {/* the skeleton */}
      <Tile
        as="figure"
        className="bg-crust flex flex-col overflow-hidden p-0! lg:col-span-6 lg:col-start-5 lg:row-start-1"
      >
        <Fig
          n={1}
          label={t.fig}
          className="lg:bg-crust tall:lg:m-4 m-5 mb-0 lg:absolute lg:top-0 lg:left-0 lg:z-10 lg:m-3 lg:px-2 lg:py-1"
        >
          {t.skeleton}
        </Fig>
        <ArtPlaceholder />
      </Tile>

      {/* tools */}
      <Tile className="bg-mantle flex flex-col justify-between gap-3 lg:col-span-4 lg:col-start-5 lg:row-start-2">
        <Title glyph="⍟">{t.uses}</Title>
        <Uses apps={content.apps} stack={content.stack} />
      </Tile>

      {/* blog */}
      <Tile
        edge="peach"
        className="bg-peach text-crust p-0! lg:col-span-2 lg:col-start-9 lg:row-start-2"
      >
        <a
          href={`/${lang}/blog`}
          className="group tall:p-6 flex h-full flex-col justify-between gap-3 p-5 no-underline"
        >
          <span className="flex items-baseline justify-between">
            <Title on="peach" glyph="¶">
              {t.blog}
            </Title>
            <span
              aria-hidden
              className="text-lead font-bold transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </span>
          {content.latestPost && (
            <span className="flex flex-col gap-1">
              <span className="text-meta opacity-70">{t.latestPost}</span>
              <span className="text-body decoration-crust/0 group-hover:decoration-crust leading-snug font-bold underline underline-offset-4">
                {content.latestPost.title}
              </span>
              <span className="text-meta line-clamp-3 leading-snug">
                {content.latestPost.excerpt}
              </span>
            </span>
          )}
        </a>
      </Tile>

      {/* write */}
      <Tile
        edge="mauve"
        className="bg-mauve text-crust order-last flex flex-col justify-between gap-5 lg:order-none lg:col-span-2 lg:col-start-11 lg:row-span-2 lg:row-start-1"
      >
        <div className="flex flex-col items-start gap-3">
          <Title on="mauve" glyph="@">
            {t.contact}
          </Title>
          <a
            href={`mailto:${EMAIL}`}
            className="text-body decoration-crust/40 hover:decoration-crust -my-1 block py-1 font-bold underline underline-offset-4"
          >
            {mailbox}
            <wbr />@{domain}
          </a>
        </div>
        <ul className="m-0 flex list-none flex-col p-0">
          {content.links.map((link) => (
            <li key={link.label}>
              <a
                href={link.url}
                className="group text-lead flex items-baseline justify-between py-0.5 font-bold tracking-[-0.03em]"
              >
                {link.label}
                <span
                  aria-hidden
                  className="text-body opacity-0 transition-opacity group-hover:opacity-100"
                >
                  →
                </span>
              </a>
            </li>
          ))}
        </ul>
        <pre
          aria-label="L1"
          data-glitch
          className="text-crust tall:block m-0 hidden self-start text-[5px] leading-none"
        >
          <Letters text={LOGO} />
        </pre>
      </Tile>

      {/* the eye */}
      <Tile as="figure" className="bg-crust flex flex-col gap-3 overflow-hidden lg:col-span-3">
        <ArtPlaceholder />
        <Fig n={2} label={t.fig}>
          {t.eye}
        </Fig>
      </Tile>

      {/* interests */}
      <Tile edge="pink" className="bg-pink text-crust flex flex-col overflow-hidden lg:col-span-3">
        <div className="flex flex-1 flex-col justify-between gap-4">
          <Title on="pink" glyph="※">
            {t.interests}
          </Title>
          <ul className="text-body m-0 flex list-none flex-col gap-1 p-0 leading-snug">
            {content.interests.map((interest) => (
              <li key={interest.slug} className="flex items-baseline gap-2.5 py-0.5">
                <span
                  aria-hidden
                  className="bg-crust text-pink inline-block w-[2.2ch] shrink-0 text-center font-bold"
                >
                  {interest.glyph}
                </span>
                {interest.name}
              </li>
            ))}
          </ul>
        </div>
      </Tile>

      {/* projects */}
      <Tile className="bg-mantle flex flex-col gap-3 lg:col-span-6">
        <Title glyph="▚">{t.projects}</Title>
        <ol className="text-body m-0 flex min-h-0 flex-1 list-none flex-col p-0">
          {content.projects.map((project) => {
            const cells = (
              <>
                <span className="text-overlay2 group-hover:text-pink tabular-nums lg:hidden xl:inline">
                  {project.year}
                </span>
                <span className="flex flex-col">
                  {project.url ? (
                    <span className="text-text group-hover:text-pink">
                      <span className="decoration-surface2 group-hover:decoration-pink underline underline-offset-4">
                        {project.name}
                      </span>
                      <span
                        aria-hidden
                        className="text-overlay2 group-hover:text-pink ml-[0.6ch] inline-block text-[1.25em] leading-none transition-transform group-hover:translate-x-0.5"
                      >
                        →
                      </span>
                    </span>
                  ) : (
                    <span className="text-text">{project.name}</span>
                  )}
                  {project.kind && (
                    <span className="text-meta text-overlay2 whitespace-nowrap">
                      {project.kind}
                    </span>
                  )}
                </span>
                <span
                  className="font-text text-meta col-start-2 leading-snug lg:col-start-auto lg:line-clamp-2"
                  title={project.description}
                >
                  {project.description}
                </span>
              </>
            );

            return (
              <li key={project.slug} className="border-surface0 flex border-t lg:min-h-0 lg:flex-1">
                {project.url ? (
                  <a href={project.url} className={`group hover:text-pink ${ROW}`}>
                    {cells}
                  </a>
                ) : (
                  <div className={ROW}>{cells}</div>
                )}
              </li>
            );
          })}
        </ol>
      </Tile>
    </main>
  );
};

export default PortfolioHome;
