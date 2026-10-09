/** What the total needs from a chain or charm. */
type PricedAddOn = { id: string; unitPrice: number };

export type GloveConfiguredTotal<T extends PricedAddOn> = {
  chain: T | null;
  charms: T[];
  /** Chain line amount (unit price × quantity); 0 with no chain. */
  chainAmount: number;
  /** One amount per chosen charm, in picker order (unit price × quantity). */
  charmAmounts: number[];
  /** Chain + charms. */
  addOnsAmount: number;
  /** Glove + chain + charms. */
  total: number;
  hasAddOns: boolean;
};

/**
 * The one place the PDP adds up a configured glove: glove line + the chosen
 * chain + the chosen charms, each add-on once per glove (× quantity). The
 * add-on picker's running total and the buy box's price / mobile buy bar all
 * read this, so the numbers can never disagree.
 */
export function gloveConfiguredTotal<T extends PricedAddOn>({
  gloveAmount,
  quantity,
  chains,
  charms,
  chainId,
  charmIds,
}: {
  /** Glove line amount: unit price × quantity. */
  gloveAmount: number;
  quantity: number;
  chains: readonly T[];
  charms: readonly T[];
  chainId: string | null;
  charmIds: readonly string[];
}): GloveConfiguredTotal<T> {
  const chain = chains.find((c) => c.id === chainId) ?? null;
  const chosenCharms = charms.filter((c) => charmIds.includes(c.id));
  const chainAmount = chain ? chain.unitPrice * quantity : 0;
  const charmAmounts = chosenCharms.map((c) => c.unitPrice * quantity);
  const addOnsAmount =
    chainAmount + charmAmounts.reduce((sum, amount) => sum + amount, 0);
  return {
    chain,
    charms: chosenCharms,
    chainAmount,
    charmAmounts,
    addOnsAmount,
    total: gloveAmount + addOnsAmount,
    hasAddOns: chain !== null || chosenCharms.length > 0,
  };
}
