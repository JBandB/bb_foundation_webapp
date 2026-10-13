/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/** `pnpm template:verify`: voor CI. Exitcode 1 bij elk probleem. */
import { verifyProject } from "../lib/verify";

export function runVerify(root: string): number {
  const result = verifyProject(root);
  if (result.problems.length > 0) {
    console.error(`Template: ${result.problems.length} probleem(en).\n`);
    for (const problem of result.problems) console.error(`  ${problem}`);
    return 1;
  }
  console.log(`Template: schoon. ${result.checked} bestanden en gedeelde bestanden gecontroleerd tegen de lock.`);
  return 0;
}
