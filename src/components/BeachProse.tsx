"use client";

import ReactMarkdown from "react-markdown";

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

export function BeachProse({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      disallowedElements={[...DISALLOWED_ELEMENTS]}
      unwrapDisallowed
      skipHtml
      components={{
        p: ({ children }) => <>{children}</>,
        a: ({ href, children }) => (
          <a href={href} className="text-ocean-700 underline underline-offset-2 hover:text-ocean-600">
            {children}
          </a>
        )
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
