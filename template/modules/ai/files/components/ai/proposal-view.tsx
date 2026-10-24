/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { Chip } from "@/components/ui/chip";
import type { AiOutputField } from "@/lib/ai/prompts";
import type { Proposal, ProposalValue } from "@/lib/ai/structure";
import { labels } from "@/lib/i18n/labels";

/**
 * Een voorstel van Claude, altijd in dezelfde vorm: per onderdeel uit de catalogus het label en de
 * waarde, met vaste componenten per soort. AI vult de inhoud; dit bepaalt hoe het eruitziet. Een
 * project toont een voorstel altijd hiermee, en zet er zelf de knoppen Aanpassen en Bevestigen bij.
 */
export function ProposalView({ fields, proposal }: { fields: readonly AiOutputField[]; proposal: Proposal }) {
  return (
    <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px] max-sm:grid-cols-1">
      {fields.map((field) => (
        <div key={field.key} className="contents">
          <dt className="text-foreground-soft font-medium">{field.label}</dt>
          <dd className="m-0 min-w-0">
            <Value field={field} value={proposal[field.key]} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Value({ field, value }: { field: AiOutputField; value: ProposalValue | undefined }) {
  if (value === undefined) return null;
  if (field.kind === "choice" && typeof value === "string") return <Chip tone="info">{value}</Chip>;
  if (field.kind === "yesno" && typeof value === "boolean") return <span>{value ? labels.ai.yes : labels.ai.no}</span>;
  if (field.kind === "number" && typeof value === "number") return <span className="num">{value}</span>;
  if (Array.isArray(value)) {
    const items = field.items ?? [];
    if (items.length === 0) {
      return (
        <ul className="m-0 list-disc pl-5">
          {value.map((entry, index) => (
            <li key={index}>{typeof entry === "string" ? entry : ""}</li>
          ))}
        </ul>
      );
    }
    return (
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            {items.map((item) => (
              <th key={item.key} scope="col" className="border-border text-foreground-soft border-b py-1 pr-3 text-left font-medium">
                {item.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {value.map((entry, index) => (
            <tr key={index}>
              {items.map((item) => (
                <td key={item.key} className="border-border border-b py-1 pr-3 align-top">
                  {typeof entry === "object" && entry !== null ? (entry as Readonly<Record<string, string>>)[item.key] : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return <p className="m-0 whitespace-pre-wrap">{String(value)}</p>;
}
