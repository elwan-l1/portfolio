import { useEffect, useState } from "react";

import { recordView } from "@/lib/blog";
import type { Post } from "@/lib/blog.server";

import { PostLink, formatDate, formatViews } from "./shared";
import { TEXT as t } from "@/constants/blog";

export const PostBody = ({ html }: { html: string }) => (
  <div className="post" dangerouslySetInnerHTML={{ __html: html }} />
);

export const PostMeta = ({ post }: { post: Post }) => (
  <p className="text-meta m-0 flex flex-wrap gap-x-3 gap-y-1 tabular-nums">
    <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>
    <span>
      {post.minutes} {t.minRead}
    </span>
    <span>
      {formatViews(post.views)} {t.views}
    </span>
  </p>
);

// only the landing page has a meaningful referrer and utm_source; later pages are client navigations
const landedHere = () => {
  const [entry] = performance.getEntriesByType("navigation");
  return !!entry && new URL(entry.name).pathname === location.pathname;
};

const originOfView = () => {
  if (!landedHere()) return { internal: true };

  const referrer = document.referrer ? new URL(document.referrer).hostname : undefined;
  if (referrer === location.hostname) return { internal: true };

  return {
    utm: new URLSearchParams(location.search).get("utm_source") ?? undefined,
    referrer,
  };
};

// once per tab session, from the browser only, so crawlers that do not run JS are not counted
export const ViewCounter = ({ slug }: { slug: string }) => {
  useEffect(() => {
    const key = `viewed:${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void recordView({ data: { slug, ...originOfView() } });
  }, [slug]);

  return null;
};

export const Toc = ({ headings }: { headings: Post["headings"] }) => {
  const [active, setActive] = useState(headings[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "0px 0px -75% 0px" },
    );
    for (const { id } of headings) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label={t.onThisPage} className="flex flex-col gap-2">
      <h2 className="text-meta text-overlay1 m-0 font-normal">{t.onThisPage}</h2>
      <ol className="text-meta m-0 flex list-none flex-col p-0">
        {headings.map(({ id, text, level }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={id === active ? "location" : undefined}
              className={`border-l py-1 pr-2 leading-snug no-underline ${level === 3 ? "pl-6" : "pl-3"} ${id === active ? "border-pink text-text" : "border-surface1 text-subtext0 hover:text-text"}`}
            >
              {text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export const MorePosts = ({ post }: { post: Post }) => {
  if (post.more.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-meta text-overlay1 m-0 font-normal">{t.morePosts}</h2>
      <ul className="m-0 flex list-none flex-col p-0">
        {post.more.map((other) => (
          <li key={other.slug} className="border-surface0 border-t">
            <PostLink slug={other.slug} className="group flex flex-col gap-0.5 py-2.5 no-underline">
              <span className="text-body text-text group-hover:text-pink">{other.title}</span>
              <span className="text-meta text-overlay2">{formatDate(other.publishedAt)}</span>
            </PostLink>
          </li>
        ))}
      </ul>
    </section>
  );
};
