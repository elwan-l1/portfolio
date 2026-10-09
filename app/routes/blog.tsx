import { BlogBackdrop } from "@/components/blog/blog-backdrop";
import { Trail } from "@/components/trail";

import { Outlet, createFileRoute, useParams } from "@tanstack/react-router";

// in the layout so it stays mounted and can animate between the list and a post
const Blog = () => {
  const { slug } = useParams({ strict: false });

  return (
    <>
      <Trail />
      <BlogBackdrop reading={!!slug} />
      <Outlet />
    </>
  );
};

export const Route = createFileRoute("/blog")({ component: Blog });
