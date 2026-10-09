import { sourceOfHost, sourceOfName } from "@/constants/sources";

export type ViewOrigin = {
  // the reader came from another page of this site
  internal?: boolean;
  utm?: string;
  referrer?: string;
};

const text = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase().slice(0, 100) : "";

/** Maps untrusted client input onto a fixed set of source names. */
export const resolveSource = ({ internal, utm, referrer }: ViewOrigin) => {
  if (internal === true) return "internal";

  const tagged = text(utm);
  const linked = text(referrer);

  return (
    (tagged && sourceOfName(tagged)) ||
    (linked && sourceOfHost(linked)) ||
    (tagged || linked ? "other" : "direct")
  );
};
