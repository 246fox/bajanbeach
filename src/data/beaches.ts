import type { Beach } from "@/types/beach";
import { beachBatch01 } from "@/data/batches/beach-batch-01";
import { beachBatch02 } from "@/data/batches/beach-batch-02";
import { beachBatch03 } from "@/data/batches/beach-batch-03";
import { beachBatch04 } from "@/data/batches/beach-batch-04";
import { beachBatch05 } from "@/data/batches/beach-batch-05";
import { beachBatch06 } from "@/data/batches/beach-batch-06";
import { beachBatch07 } from "@/data/batches/beach-batch-07";

export const beaches: Beach[] = [
  ...beachBatch01,
  ...beachBatch02,
  ...beachBatch03,
  ...beachBatch04,
  ...beachBatch05,
  ...beachBatch06,
  ...beachBatch07
];

export function getBeachBySlug(slug: string): Beach | undefined {
  return beaches.find((b) => b.slug === slug);
}

/** Match slug or display name (for `/api/beach-photos?beach=`). */
export function findBeachByPhotoApiParam(param: string): Beach | undefined {
  const t = param.trim();
  return beaches.find((b) => b.slug === t || b.name === t);
}
