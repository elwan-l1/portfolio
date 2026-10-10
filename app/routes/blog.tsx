import { Dust } from "@/components/dust";
import { Trail } from "@/components/trail";

import { Outlet, createFileRoute, useParams } from "@tanstack/react-router";

// in the layout so it stays mounted and can animate between the list and a post
const Blog = () => {
  const { slug } = useParams({ strict: false });

  return (
    <>
      <Trail />
      <Dust apart={!!slug} />
      <Outlet />
    </>
  );
};

export const Route = createFileRoute("/blog")({ component: Blog });
