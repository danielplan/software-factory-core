// The branch a card is built on: the same one a prototype of it is
// pushed to while planning (the plan skill), so the build continues it.
export function branchOf(number: number): string {
  return `factory/issue-${String(number)}`;
}
