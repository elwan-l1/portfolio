import { addView, getBlogIndex, getPost } from "./blog.server";
import { resolveSource, type ViewOrigin } from "./source.server";
import { createServerFn } from "@tanstack/react-start";

export const getBlog = createServerFn({ method: "GET" }).handler(() => getBlogIndex());

export const getBlogPost = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(({ data: slug }) => getPost(slug));

export const recordView = createServerFn({ method: "POST" })
  .validator((input: ViewOrigin & { slug: string }) => {
    if (typeof input.slug !== "string") throw new Error("slug must be a string");
    return input;
  })
  .handler(async ({ data: { slug, ...origin } }) => {
    await addView(slug, resolveSource(origin));
  });
