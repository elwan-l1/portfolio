import { useRef } from "react";

import type { IndexPost } from "@/lib/blog.server";

import { PostArt } from "./post-art";
import { BlogNav, PostLink, formatDate, formatViews, mostViewed } from "./shared";
import { TagLinks } from "./tag-links";
import { TEXT as t } from "@/constants/blog";
import { Link, useNavigate } from "@tanstack/react-router";

type Filters = { tag?: string; q?: string; sort?: "views" };

export const BlogIndex = ({ posts, tag, q, sort }: { posts: IndexPost[] } & Filters) => {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const needle = q?.trim().toLowerCase();
  const matching = posts.filter(
    (post) =>
      (!tag || post.tags.includes(tag)) &&
      (!needle || `${post.title} ${post.excerpt}`.toLowerCase().includes(needle)),
  );
  const list = sort === "views" ? mostViewed(matching, matching.length) : matching;
  const filtered = !!(tag || needle);

  const counts = new Map<string, number>();
  for (const post of posts)
    for (const name of post.tags) counts.set(name, (counts.get(name) ?? 0) + 1);
  const tags = [...counts].sort(([a, x], [b, y]) => y - x || a.localeCompare(b));

  const order = (key: Filters["sort"], label: string) => (
    <Link
      to="."
      search={{ tag, q, sort: key }}
      replace
      aria-current={sort === key ? "true" : undefined}
      className={`no-underline ${sort === key ? "text-text decoration-pink underline decoration-2 underline-offset-8" : "text-subtext0 hover:text-text"}`}
    >
      {label}
    </Link>
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-6 sm:px-8">
      <BlogNav />

      <header className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-text m-0 text-5xl leading-none font-bold tracking-[-0.05em]">
            {t.blog}
          </h1>
          <p className="text-body text-subtext0 m-0 max-w-[52ch]">{t.intro}</p>
        </div>

        <div className="border-surface0 flex flex-col gap-5 border-t pt-5">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
            <label className="text-body text-overlay1 focus-within:text-pink flex min-w-48 flex-1 items-center gap-3">
              <span aria-hidden>/</span>
              <input
                ref={input}
                type="search"
                defaultValue={q}
                placeholder={t.search}
                aria-label={t.search}
                onChange={(event) =>
                  navigate({
                    to: ".",
                    search: { tag, q: event.target.value || undefined, sort },
                    replace: true,
                  })
                }
                className="text-text placeholder:text-overlay0 w-full border-0 bg-transparent p-0 font-[inherit] outline-none"
              />
            </label>
            <div className="text-meta flex gap-5">
              {order(undefined, t.latest)}
              {order("views", t.mostViewed)}
            </div>
          </div>

          {tags.length > 0 && (
            <ul
              aria-label={t.tags}
              className="text-meta m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0"
            >
              {tags.map(([name, count]) => (
                <li key={name}>
                  <Link
                    to="."
                    search={{ tag: name === tag ? undefined : name, q, sort }}
                    replace
                    aria-current={name === tag ? "true" : undefined}
                    className={`no-underline ${name === tag ? "bg-pink text-crust -mx-1.5 px-1.5 font-bold" : "text-subtext0 hover:text-pink"}`}
                  >
                    #{name} <span className={name === tag ? "" : "text-overlay0"}>{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {filtered && (
            <p className="text-meta text-overlay2 m-0 flex flex-wrap items-baseline gap-x-3">
              <span>
                {list.length} {t.of} {posts.length} {t.posts}
              </span>
              <Link
                to="."
                search={{ sort }}
                replace
                onClick={() => input.current && (input.current.value = "")}
                className="text-pink"
              >
                {t.clear}
              </Link>
            </p>
          )}
        </div>
      </header>

      {posts.length === 0 && <p className="text-subtext0 m-0">{t.noPosts}</p>}
      {posts.length > 0 && list.length === 0 && <p className="text-subtext0 m-0">{t.noMatch}</p>}

      <ol className="m-0 flex list-none flex-col p-0">
        {list.map((post, i) => (
          <li
            key={post.slug}
            className="group border-surface0 relative flex items-start gap-5 border-t py-6"
          >
            {post.art && <PostArt art={post.art} size={96} />}
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-meta text-overlay2 flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
                {sort === "views" && (
                  <span className="text-pink">{String(i + 1).padStart(2, "0")}</span>
                )}
                {!sort && !filtered && i === 0 && (
                  <span className="bg-pink text-crust px-1.5">{t.newPost}</span>
                )}
                <span className="whitespace-nowrap">{formatDate(post.publishedAt)}</span>
                <span className="whitespace-nowrap">
                  {formatViews(post.views)} {t.views}
                </span>
              </span>
              <h2 className="m-0 text-2xl leading-tight font-bold tracking-[-0.03em]">
                <PostLink
                  slug={post.slug}
                  className="text-text group-hover:text-pink no-underline after:absolute after:inset-0"
                >
                  {post.title}
                </PostLink>
              </h2>
              <p className="text-body text-subtext0 m-0 max-w-[60ch] leading-relaxed">
                {post.excerpt}
              </p>
              <TagLinks tags={post.tags} active={tag} to="." />
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
};
