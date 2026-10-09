/** "Address Book" -> "Address book": the shared nav helper's labels, sentence case. */
export function sentenceCase(label: string): string {
  return label.charAt(0) + label.slice(1).toLowerCase();
}
