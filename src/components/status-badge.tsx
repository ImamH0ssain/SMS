import { type VariantProps } from "class-variance-authority";

import { Badge, badgeVariants } from "@/components/ui/badge";

const color = (value: string): VariantProps<typeof badgeVariants>["variant"] => {
  if (["ENROLLED", "PUBLISHED", "ACTIVE", "PAID", "ON_TIME"].includes(value)) return "success";
  if (["DEFERRED", "WITHHELD", "LATE", "DRAFT"].includes(value)) return "warning";
  if (["WITHDRAWN", "OVERDUE", "VOIDED"].includes(value)) return "danger";
  return "neutral";
};

export function StatusBadge({ value }: { value: string }) {
  return <Badge variant={color(value)}>{value.replaceAll("_", " ")}</Badge>;
}
