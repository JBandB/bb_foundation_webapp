/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import type { DocBlock, DocSpan } from "@/lib/domain/doc-markdown";

/**
 * Een document uit de repo op het scherm. Zie lib/domain/doc-markdown.ts.
 *
 * **Geen `dangerouslySetInnerHTML`.** De parser levert blokken, dit tekent ze als JSX. Er is dus geen
 * pad waarlangs iets uit een bestand als HTML op het scherm komt.
 *
 * **Het besluitenlog wordt geen tabel maar een reeks kaarten.** Die tabel heeft drie kolommen waarvan
 * de laatste een halve alinea is; als tabel is dat een muur die niemand leest. Een kaart per besluit
 * leest als wat het is: een nummer, een uitspraak, en waarom. Herkenbaar aan de kopregel `#`.
 */
export function DocView({ blocks }: { blocks: readonly DocBlock[] }) {
  return (
    <div className="flex max-w-[80ch] flex-col gap-3">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: DocBlock }) {
  if (block.kind === "heading") {
    /* Eén niveau lager dan in het bestand: de paginatitel is al de h1 van dit scherm. */
    const size = block.level <= 1 ? "mt-4 text-[19px]" : block.level === 2 ? "mt-5 text-[16px] font-semibold" : "mt-3 text-[14px] font-semibold";
    const Tag = (block.level <= 2 ? "h2" : "h3") as "h2" | "h3";
    return (
      <Tag className={`${size} leading-tight`}>
        <Spans spans={block.spans} />
      </Tag>
    );
  }

  if (block.kind === "paragraph") {
    return (
      <p className="text-foreground-soft text-[13px] leading-relaxed">
        <Spans spans={block.spans} />
      </p>
    );
  }

  if (block.kind === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag className={`text-foreground-soft flex flex-col gap-1 pl-5 text-[13px] leading-relaxed ${block.ordered ? "list-decimal" : "list-disc"}`}>
        {block.items.map((item, index) => (
          <li key={index}>
            <Spans spans={item} />
          </li>
        ))}
      </Tag>
    );
  }

  if (block.kind === "code") {
    return (
      <pre className="border-border bg-muted rounded-md overflow-x-auto border p-3 text-[12px]">
        <code>{block.text}</code>
      </pre>
    );
  }

  /* Het besluitenlog: een kaart per besluit in plaats van een tabel van drie kolommen. */
  const first = block.head[0]?.map((span) => span.text).join("").trim();
  if (first === "#") {
    return (
      <div className="flex flex-col gap-3">
        {block.rows.map((row, index) => (
          <article key={index} className="border-border rounded-md border p-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="num bg-neutral-bg text-neutral-fg rounded-full px-2 py-0.5 text-[11px]">
                <Spans spans={row[0] ?? []} />
              </span>
              <span className="text-[14px] leading-snug">
                <Spans spans={row[1] ?? []} />
              </span>
            </div>
            {row[2] !== undefined && (
              <p className="text-foreground-soft mt-2 text-[13px] leading-relaxed">
                <Spans spans={row[2]} />
              </p>
            )}
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-border w-full border-collapse border text-[13px]">
        <thead>
          <tr className="bg-muted text-left">
            {block.head.map((cell, index) => (
              <th key={index} className="border-border border px-2 py-1.5 font-semibold">
                <Spans spans={cell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, spot) => (
                <td key={spot} className="border-border border px-2 py-1.5 align-top">
                  <Spans spans={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Spans({ spans }: { spans: readonly DocSpan[] }) {
  return (
    <>
      {spans.map((span, index) =>
        span.code === true ? (
          <code key={index} className="bg-muted rounded-sm px-1 text-[12px]">
            {span.text}
          </code>
        ) : span.bold === true ? (
          <strong key={index} className="text-foreground font-semibold">
            {span.text}
          </strong>
        ) : span.italic === true ? (
          <em key={index}>{span.text}</em>
        ) : (
          <span key={index}>{span.text}</span>
        ),
      )}
    </>
  );
}
