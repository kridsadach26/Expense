export function collectionStatus(project, round) {
  const settled = project.travelPlan?.fundContributions || [];
  const pending = project.pending || [];
  return round.targets.map(target => ({
    ...target,
    paid: settled.filter(item => item.collectionId === round.id && item.contributorId === target.id)
      .reduce((sum, item) => sum + Math.round(Number(item.amount) * 100), 0),
    pending: pending.filter(item => item.kind === 'collection' && item.collectionId === round.id)
      .flatMap(item => item.allocations).filter(item => item.id === target.id)
      .reduce((sum, item) => sum + item.cents, 0)
  }));
}

export function allocateCollection(project, round, memberId, together, cents) {
  if (!Number.isSafeInteger(cents) || cents < 1) return null;
  const pair = together && (project.paymentPairs || []).find(ids => ids.includes(memberId));
  if (together && !pair) return null;
  const ids = pair || [memberId];
  const targets = collectionStatus(project, round).filter(item => ids.includes(item.id));
  if (targets.length !== ids.length) return null;
  const balances = targets.map(item => ({ id: item.id, due: Math.max(0, item.cents - item.paid - item.pending) }));
  const total = balances.reduce((sum, item) => sum + item.due, 0);
  if (cents > total) return null;
  let balance = cents;
  return balances.map((item, index) => {
    const value = index === balances.length - 1 ? balance : Math.min(item.due, Math.round(cents * (item.due / total)));
    balance -= value;
    return { id: item.id, cents: value };
  }).filter(item => item.cents > 0);
}
