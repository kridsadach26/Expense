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
    return { from: name(item.fromId), to: name(item.toId), date: item.date, value };
  }).sort(byDate);

  return {
    start: project.start, end: project.end, destination: trip.destination,
    total, expenseCount: expenses.length, memberCount: members.filter(m => m.active !== false).length,
    pendingCount: project.pending?.length || 0,
    fund: hasFund ? { received, spent, balance: received - spent, holder: name(holder) } : null,
    balances: members.map(member => ({ name: member.name, net: net.get(member.id) })),
    expenses,
    payments,
    schedule: (trip.itinerary || []).map(({ date, time, title, place }) => ({ date, time, title, place }))
      .sort((a, b) => ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')))
  };
}
