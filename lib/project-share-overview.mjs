const amount = value => Number(value) || 0;
const base = item => amount(item.baseAmount ?? amount(item.amount) * amount(item.exchangeRate || 1));
const byDate = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));

export function expenseProofImages(expense) {
  return (Array.isArray(expense.images) ? expense.images : []).filter(image =>
    typeof image === 'string' && /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/i.test(image)
  );
}

export function projectShareOverview(project) {
  const members = project.members || [];
  const names = new Map(members.map(member => [member.id, member.name]));
  const net = new Map(members.map(member => [member.id, 0]));
  const add = (id, value) => { if (net.has(id)) net.set(id, net.get(id) + value); };
  const name = id => names.get(id) || '—';
  const groups = new Map(members.map(member => [member.id, member.id]));
  for (const pair of project.paymentPairs || []) {
    if (!Array.isArray(pair) || pair.length !== 2) continue;
    const [first, second] = pair;
    if (names.has(first) && names.has(second)) groups.set(second, first);
  }
  const groupName = id => {
    const group = groups.get(id);
    if (!group) return name(id);
    return members.filter(member => groups.get(member.id) === group).map(member => member.name).join(' + ');
  };
  const trip = project.travelPlan || {};
  const holder = names.has(trip.fundHolderId) ? trip.fundHolderId :
    (members.find(m => m.id === project.owner || m.name === project.owner) ||
      members.find(m => m.active !== false))?.id;
  const hasFund = Boolean(project.travelPlan || project.type === 'international_trip');
  let total = 0, received = 0, spent = 0;

  const expenses = (project.expenses || []).map(item => {
    const value = base(item);
    const central = hasFund && item.fundSource === 'central';
    total += value;
    if (central) spent += value;
    add(central ? item.payerId || holder : item.payerId, value);
    for (const share of item.shares || []) add(share.memberId, -amount(share.amount));
    return { id: item.id, proofCount: expenseProofImages(item).length, name: item.name, date: item.date, value, central, payer: name(item.payerId || holder) };
  }).sort(byDate);

  for (const item of trip.fundContributions || []) {
    const value = amount(item.amount) * amount(item.exchangeRate || 1);
    received += value;
    add(item.contributorId, value);
    add(item.receivedById || holder, -value);
  }

  const payments = (project.settlements || []).filter(item =>
    item.status !== 'void' && item.fromId && item.toId && item.fromId !== item.toId &&
    Number.isFinite(Number(item.amount)) && Number(item.amount) > 0
  ).map(item => {
    const value = Number(item.amount);
    add(item.fromId, value);
    add(item.toId, -value);
    return { from: groupName(item.fromId), to: groupName(item.toId), date: item.date, value };
  }).sort(byDate);

  const groupBalances = new Map();
  for (const [id, value] of net) {
    const group = groups.get(id);
    if (!groupBalances.has(group)) groupBalances.set(group, { name: groupName(id), net: 0 });
    groupBalances.get(group).net += value;
  }
  const balances = [...groupBalances.values()];
  const debtors = balances.filter(item => item.net < -0.005).map(item => ({ ...item, left: -item.net })).sort((a,b)=>b.left-a.left);
  const creditors = balances.filter(item => item.net > 0.005).map(item => ({ ...item, left: item.net })).sort((a,b)=>b.left-a.left);
  const transfers = [];
  let debtor = 0, creditor = 0;
  while (debtor < debtors.length && creditor < creditors.length) {
    const from = debtors[debtor], to = creditors[creditor];
    const amount = Math.min(from.left, to.left);
    transfers.push({ from: from.name, to: to.name, amount });
    from.left -= amount;
    to.left -= amount;
    if (from.left <= 0.005) debtor++;
    if (to.left <= 0.005) creditor++;
  }
  return {
    start: project.start, end: project.end, destination: trip.destination,
    total, expenseCount: expenses.length, memberCount: members.filter(m => m.active !== false).length,
    pendingCount: project.pending?.length || 0,
    fund: hasFund ? { received, spent, balance: received - spent, holder: name(holder) } : null,
    balances, transfers,
    expenses,
    payments,
    schedule: (trip.itinerary || []).map(({ date, time, title, place }) => ({ date, time, title, place }))
      .sort((a, b) => ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')))
  };
}
