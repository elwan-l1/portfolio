import { Link } from "@tanstack/react-router";

type TagLinksProps = { tags: string[]; active?: string; to?: "/blog" | "." };

export const TagLinks = ({ tags, active, to = "/blog" }: TagLinksProps) =>
  tags.length > 0 && (
    <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
      {tags.map((tag) => (
        <li key={tag}>
          <Link
            to={to}
            search={(prev) => ({ ...prev, tag })}
            replace={to === "."}
            className={`text-meta relative z-10 no-underline ${tag === active ? "text-pink" : "text-overlay2 hover:text-pink"}`}
          >
            #{tag}
          </Link>
        </li>
      ))}
    </ul>
  );
