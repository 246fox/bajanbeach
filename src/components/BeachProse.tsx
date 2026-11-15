"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type ReactNode
} from "react";
import ReactMarkdown from "react-markdown";
import { getSearchHighlightRanges } from "@/lib/beach-search";

const DISALLOWED_ELEMENTS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "hr",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td"
] as const;

const MARK_CLASS = "rounded-sm bg-ocean-100 text-inherit";

type BeachProseProps = {
  markdown: string;
  /** Merged onto markdown links only (e.g. grid card stacking above a block-link overlay). */
  linkOverlayClassName?: string;
  /** When set, wrap matched query prefixes in <mark> inside text nodes only. */
  highlightQuery?: string;
};

/** Plain-text highlight for non-markdown fields (e.g. bestFor). */
export function HighlightedSearchText({
  text,
  query
}: {
  text: string;
  query?: string;
}): ReactNode {
  if (!query || query.trim() === "") {
    return text;
  }
  const ranges = getSearchHighlightRanges(text, query);
  if (ranges.length === 0) {
    return text;
  }
  const parts: ReactNode[] = [];
  let last = 0;
  for (let i = 0; i < ranges.length; i++) {
    const { start, end } = ranges[i];
    if (start > last) {
      parts.push(text.slice(last, start));
    }
    parts.push(
      <mark key={`${start}-${end}-${i}`} className={MARK_CLASS}>
        {text.slice(start, end)}
      </mark>
    );
    last = end;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return <>{parts}</>;
}

function highlightNodes(children: ReactNode, query: string): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      return <HighlightedSearchText text={child} query={query} />;
    }
    if (typeof child === "number") {
      return child;
    }
    if (isValidElement<{ children?: ReactNode }>(child)) {
      if (child.props.children == null) {
        return child;
      }
      return cloneElement(child, undefined, highlightNodes(child.props.children, query));
    }
    return child;
  });
}

export function BeachProse({
  markdown,
  linkOverlayClassName,
  highlightQuery
}: BeachProseProps) {
  const linkClassName = [
    "text-ocean-700 underline underline-offset-2 hover:text-ocean-600",
    linkOverlayClassName
  ]
    .filter(Boolean)
    .join(" ");

  const activeQuery = highlightQuery?.trim() ? highlightQuery : undefined;

  return (
    <ReactMarkdown
      disallowedElements={[...DISALLOWED_ELEMENTS]}
      unwrapDisallowed
      skipHtml
      components={{
        p: ({ children }) => (
          <>{activeQuery ? highlightNodes(children, activeQuery) : children}</>
        ),
        a: ({ href, children }) => (
          <a href={href} className={linkClassName}>
            {activeQuery ? highlightNodes(children, activeQuery) : children}
          </a>
        )
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
