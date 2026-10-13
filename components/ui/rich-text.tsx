/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { parseRich, type RichSpan } from "@/lib/domain/rich-text";

/**
 * Tekst met een beetje opmaak op het scherm.
 *
 * **Geen `dangerouslySetInnerHTML`.** De parser geeft een structuur terug en dit tekent hem als JSX,
 * dus er is geen pad waarlangs iets uit een getypte tekst als HTML op het scherm komt. Dat is de hele
 * reden dat er geen markdown-bibliotheek in dit project zit.
 *
 * **Regels binnen een alinea blijven regels**, vandaar `whitespace-pre-line`.
 */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseRich(text);
  if (blocks.length === 0) return null;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {blocks.map((block, index) =>
        block.kind === "paragraph" ? (
          <p key={index} className="whitespace-pre-line">
            <Spans spans={block.spans} />
          </p>
        ) : block.ordered ? (
          <ol key={index} className="list-decimal pl-5">
            {block.items.map((item, spot) => (
              <li key={spot}>
                <Spans spans={item} />
              </li>
            ))}
          </ol>
        ) : (
          <ul key={index} className="list-disc pl-5">
            {block.items.map((item, spot) => (
              <li key={spot}>
                <Spans spans={item} />
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

function Spans({ spans }: { spans: readonly RichSpan[] }) {
  return (
    <>
      {spans.map((span, index) =>
        span.bold === true ? (
          <strong key={index} className="font-semibold">
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
