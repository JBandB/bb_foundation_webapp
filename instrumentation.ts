/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De haak van Next.js voor serverfouten: uit servercomponenten, route handlers, server actions en
 * de proxy. Zonder deze haak gaat een fout in productie nergens heen (les L-NEXT-10). Het werk zelf
 * zit in lib/monitoring/report.ts; hier wordt het alleen afgewacht, want de functie stopt zodra het
 * antwoord weg is.
 */
import type { Instrumentation } from "next";
import { reportError } from "@/lib/monitoring/report";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  await reportError(error, { route: context.routePath, method: request.method, kind: context.routeType });
};
