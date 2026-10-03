type UsesProps = {
  apps: string[];
  stack: string[];
};

const LISTS = [
  { key: "apps", item: "border-surface1 bg-surface0 text-text" },
  { key: "stack", item: "border-pink/40 bg-crust text-pink" },
] as const;

export const Uses = (props: UsesProps) => (
  <div className="text-meta flex flex-col gap-2">
    {LISTS.map(({ key, item }) => (
      <ul key={key} aria-label={key} className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {props[key].map((name) => (
          <li key={name} className={`border px-1.5 py-0.5 leading-none whitespace-nowrap ${item}`}>
            {name}
          </li>
        ))}
      </ul>
    ))}
  </div>
);
