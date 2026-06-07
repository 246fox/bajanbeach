type JsonLdProps = {
  data: Record<string, unknown>;
};

/**
 * Emits a single JSON-LD `<script>` block. Server-only; keep payloads serializable.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
