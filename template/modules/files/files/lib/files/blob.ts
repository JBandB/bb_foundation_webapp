/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Azure Blob Storage met een SAS-token, zonder SDK: een PUT om te schrijven en een GET om te lezen,
 * allebei vanaf de server. Het token staat in een omgevingsvariabele en bereikt de browser nooit;
 * downloaden gaat via onze eigen route, die het recht controleert en de inhoud doorgeeft.
 *
 * Wat de opslag in gaat, wordt eerst nagekeken: de grens van het doel, het type volgens de lijst van
 * het doel, en de eerste bytes die bij dat type horen. Een bestand dat niet is wat het zegt, komt er
 * niet in; een Office-bestand met macro's ook niet.
 */
import { fetchWithTimeout } from "@/lib/integrations/http";
import { FILE_PURPOSES } from "./purposes";

export interface PurposeSpec {
  readonly maxBytes: number;
  /** MIME-type naar extensie, voor de melding en de controle. */
  readonly types: ReadonlyMap<string, string>;
  /** Eigen container en token voor dit doel; anders die van de module. */
  readonly containerVar?: string;
  readonly tokenVar?: string;
}

export const ACCOUNT_VAR = "AZURE_STORAGE_ACCOUNT";
export const CONTAINER_VAR = "AZURE_STORAGE_CONTAINER";
export const TOKEN_VAR = "AZURE_STORAGE_SAS_TOKEN";

interface BlobConfig {
  readonly account: string;
  readonly container: string;
  readonly sasToken: string;
}

export function purposeSpec(purpose: string): PurposeSpec {
  const spec = FILE_PURPOSES[purpose];
  if (spec === undefined) throw new Error(`Onbekend bestandsdoel "${purpose}"; zet het in lib/files/purposes.ts.`);
  return spec;
}

function variablesFor(purpose: string): { readonly container: string; readonly token: string } {
  const spec = purposeSpec(purpose);
  return { container: spec.containerVar ?? CONTAINER_VAR, token: spec.tokenVar ?? TOKEN_VAR };
}

function readConfig(purpose: string): BlobConfig | undefined {
  const vars = variablesFor(purpose);
  const account = process.env[ACCOUNT_VAR] ?? "";
  const container = process.env[vars.container] ?? "";
  const sasToken = process.env[vars.token] ?? "";
  if (account === "" || container === "" || sasToken === "") return undefined;
  return { account, container, sasToken };
}

export function isConfigured(purpose: string): boolean {
  return readConfig(purpose) !== undefined;
}

export function missingConfig(purpose: string): string[] {
  const vars = variablesFor(purpose);
  return [ACCOUNT_VAR, vars.container, vars.token].filter((name) => (process.env[name] ?? "") === "");
}

/** Browsers melden een CSV als Excel of als tekst, en een onbekend type als octet-stream; de extensie weet het beter. */
export function resolveContentType(name: string, declared: string): string {
  const extension = (name.split(".").pop() ?? "").toLowerCase();
  const vague = declared === "" || declared === "application/octet-stream";
  if (extension === "csv" && (vague || declared === "application/vnd.ms-excel" || declared === "text/plain")) return "text/csv";
  if (extension === "xlsx" && vague) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (extension === "pdf" && vague) return "application/pdf";
  return declared;
}

const SIGNATURES: Readonly<Record<string, readonly number[]>> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2d],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [0x50, 0x4b, 0x03, 0x04],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [0x50, 0x4b, 0x03, 0x04],
  "application/vnd.ms-excel": [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
};

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

export type ContentProblem = "notText" | "notCsv" | "mismatch" | "macros";

/** Past de inhoud bij het type? Undefined als het klopt of als het type geen vaste handtekening heeft. */
export function verifyContent(bytes: Uint8Array, contentType: string): ContentProblem | undefined {
  if (contentType === "text/csv") {
    if (bytes.includes(0)) return "notText";
    if (Object.values(SIGNATURES).some((signature) => startsWith(bytes, signature))) return "notCsv";
    return undefined;
  }
  const signature = SIGNATURES[contentType];
  if (signature === undefined) return undefined;
  if (!startsWith(bytes, signature)) return "mismatch";
  if (contentType.startsWith("application/vnd.openxmlformats-officedocument.")) {
    /* De namen in een zip staan onversleuteld in de inhoudsopgave; een macro heet altijd zo. */
    if (Buffer.from(bytes).includes("vbaProject.bin", 0, "latin1")) return "macros";
  }
  return undefined;
}

export function blobPathFor(purpose: string, entityType: string, entityId: string, filename: string, now: Date): string {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const safe = filename.replace(/[^\w.-]/g, "_").slice(-80);
  return `${purpose}/${entityType}/${entityId}/${stamp}-${safe}`;
}

export type UploadProblem = "notConfigured" | "empty" | "tooLarge" | "wrongType" | ContentProblem | "rejected";

export type UploadResult =
  | { readonly ok: true; readonly blobPath: string; readonly sizeBytes: number; readonly contentType: string }
  | { readonly ok: false; readonly problem: UploadProblem; readonly detail?: string };

export async function uploadBlob(input: { purpose: string; entityType: string; entityId: string; file: File; now?: Date }): Promise<UploadResult> {
  const spec = purposeSpec(input.purpose);
  const config = readConfig(input.purpose);
  if (config === undefined) return { ok: false, problem: "notConfigured", detail: missingConfig(input.purpose).join(", ") };
  if (input.file.size === 0) return { ok: false, problem: "empty" };
  if (input.file.size > spec.maxBytes) return { ok: false, problem: "tooLarge" };

  const contentType = resolveContentType(input.file.name, input.file.type);
  if (!spec.types.has(contentType)) return { ok: false, problem: "wrongType", detail: [...new Set(spec.types.values())].join(", ") };

  const body = await input.file.arrayBuffer();
  const wrong = verifyContent(new Uint8Array(body), contentType);
  if (wrong !== undefined) return { ok: false, problem: wrong };

  const blobPath = blobPathFor(input.purpose, input.entityType, input.entityId, input.file.name, input.now ?? new Date());
  const response = await fetchWithTimeout(blobUrl(config, blobPath), { method: "PUT", headers: { "x-ms-blob-type": "BlockBlob", "content-type": contentType }, body });
  if (!response.ok) return { ok: false, problem: "rejected", detail: await explain(response) };
  return { ok: true, blobPath, sizeBytes: input.file.size, contentType };
}

/** De URL met token om te lezen, alleen voor de server. Undefined als de opslag niet is ingericht. */
export function downloadUrl(purpose: string, blobPath: string): string | undefined {
  const config = readConfig(purpose);
  return config === undefined ? undefined : blobUrl(config, blobPath);
}

function blobUrl(config: BlobConfig, blobPath: string): string {
  return `https://${config.account}.blob.core.windows.net/${config.container}/${encodeURI(blobPath)}?${config.sasToken.replace(/^\?/, "")}`;
}

/** De foutcode van Azure in woorden die zeggen wat je moet nakijken. */
export async function explain(response: Response): Promise<string> {
  const code = response.headers.get("x-ms-error-code") ?? "";
  const body = await response.text().catch(() => "");
  const detail = /<Message>([^<]*)/.exec(body)?.[1]?.split("\n")[0]?.trim() ?? "";
  const hints: Readonly<Record<string, string>> = {
    AuthenticationFailed: "het token hoort bij een andere container, of de containernaam klopt niet",
    AuthorizationPermissionMismatch: "het token mist een recht; voor uploaden zijn Create en Write nodig",
    AuthorizationFailure: "het token mist een recht; voor uploaden zijn Create en Write nodig",
    ContainerNotFound: "de container bestaat niet onder deze naam",
    InvalidResourceName: "een containernaam mag alleen kleine letters, cijfers en streepjes bevatten",
  };
  const hint = hints[code];
  return `status ${response.status}${code === "" ? "" : ` (${code})`}${hint === undefined ? "" : `: ${hint}`}${detail === "" ? "" : `. Azure: ${detail}`}`;
}
