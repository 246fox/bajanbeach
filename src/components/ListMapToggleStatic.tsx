import Link from "next/link";
import {
  LIST_MAP_TOGGLE_ACTIVE_CLASS,
  LIST_MAP_TOGGLE_INACTIVE_CLASS
} from "@/components/list-map-toggle-styles";

/** Homepage default: no query string — avoids useSearchParams in static HTML. */
export function ListMapToggleStatic() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Link href="/" className={LIST_MAP_TOGGLE_ACTIVE_CLASS} scroll={false}>
        List
      </Link>
      <Link href="/map" className={LIST_MAP_TOGGLE_INACTIVE_CLASS} scroll={false}>
        Map
      </Link>
    </div>
  );
}
