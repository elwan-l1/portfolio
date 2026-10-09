import type { Post } from "@/lib/blog.server";

import { PostArt } from "./post-art";
import { MorePosts, PostBody, PostMeta, Toc, ViewCounter } from "./post-parts";
import { BlogNav } from "./shared";
import { TagLinks } from "./tag-links";

export const BlogArticle = ({ post }: { post: Post }) => (
  <main className="mx-auto flex w-full max-w-[50rem] flex-col gap-8 px-4 py-6">
    <BlogNav back />

    <header className="flex flex-col gap-4">
      {post.art && (
        <div className="self-center">
          <PostArt art={post.art} size={160} />
        </div>
      )}
      <h1 className="text-text m-0 text-3xl leading-[1.1] font-bold tracking-[-0.04em] text-balance sm:text-4xl">
        {post.title}
      </h1>
      <p className="text-lead text-subtext0 m-0 leading-snug">{post.excerpt}</p>
      <div className="text-overlay2 flex flex-col gap-3">
        <PostMeta post={post} />
        <TagLinks tags={post.tags} />
      </div>
    </header>

    <div className="relative flex flex-col gap-6">
      <aside className="order-first xl:absolute xl:inset-y-0 xl:left-full xl:order-none xl:ml-8 xl:w-48">
        <div className="xl:sticky xl:top-6">
          <Toc key={post.slug} headings={post.headings} />
        </div>
      </aside>
      <article className="bg-mantle border-surface0 border p-6 sm:p-10">
        <PostBody html={post.html} />
      </article>
    </div>

    <footer className="border-surface0 flex flex-col gap-10 border-t pt-8">
      <MorePosts post={post} />
    </footer>
    <ViewCounter slug={post.slug} />
  </main>
);
