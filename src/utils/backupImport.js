/* Helpers for restoring JSON backups created by the Download Data modal. */

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const asText = (value) => (typeof value === 'string' ? value.trim() : '');

const nameKey = (value) => asText(value).toLowerCase();

const normalizeCapital = (capital) => ({
  ...capital,
  name: asText(capital.name),
  color: asText(capital.color) || 'blue',
});

const makeId = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const readArray = (payload, key) => {
  const value = payload[key];

  if (value == null) return [];

  if (!Array.isArray(value)) {
    throw new Error(`The backup's "${key}" section is invalid.`);
  }

  if (value.some((item) => !isObject(item))) {
    throw new Error(`The backup's "${key}" section contains invalid records.`);
  }

  return value;
};

const normalizeSettings = (incoming, fallback) => {
  const next = {
    ...fallback,
    ...(isObject(incoming) ? incoming : {}),
  };

  if (!asText(next.currency)) next.currency = fallback.currency;
  else next.currency = asText(next.currency);

  if (typeof next.darkMode !== 'boolean') next.darkMode = fallback.darkMode;

  return next;
};

/* A capital export only contains one capital and its records. Keep only that
   slice so importing it can never affect the other capitals. */
const scopeToCapital = (data, capital) => {
  const targetId = asText(capital.id);

  const belongs = (item) => {
    const itemCapitalId = asText(item.capitalId);
    return !itemCapitalId || itemCapitalId === targetId;
  };

  return {
    ...data,
    capitals: [capital],
    fund: [],
    sources: data.sources.filter(belongs),
    expenses: data.expenses.filter(belongs),
    transactions: data.transactions.filter(belongs),
  };
};

/**
 * Parse and validate a JSON backup.
 *
 * Returns { payload, meta } where payload is normalised and (for a capital
 * export) already limited to the exported capital. Throws an Error with a
 * user-readable message when the file cannot be imported.
 */
export const parseBackup = (rawText, fileName = 'backup.json') => {
  let parsed;

  try {
    parsed = JSON.parse(String(rawText || '').replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error('That file is not valid JSON.');
  }

  if (!isObject(parsed)) {
    throw new Error('That file is not an MTrack backup.');
  }

  if (!Array.isArray(parsed.capitals)) {
    throw new Error('The backup is missing its capitals list.');
  }

  const rawScope = isObject(parsed.scope) ? parsed.scope : null;
  const isCapitalExport =
    parsed.exportType === 'capital' || rawScope?.type === 'capital';

  const capitals = readArray(parsed, 'capitals');
  const invalidCapital = capitals.find((capital) => !asText(capital.name));

  if (invalidCapital) {
    throw new Error('The backup contains a capital without a name.');
  }

  let targetCapital = null;

  if (isCapitalExport) {
    const scopeId = asText(rawScope?.capitalId);
    targetCapital =
      capitals.find((capital) => asText(capital.id) === scopeId) || capitals[0];

    if (!targetCapital) {
      throw new Error('The capital backup does not contain a capital.');
    }
  }

  const data = {
    ...parsed,
    capitals,
    fund: readArray(parsed, 'fund'),
    sources: readArray(parsed, 'sources'),
    expenses: readArray(parsed, 'expenses'),
    transactions: readArray(parsed, 'transactions'),
    settings: isObject(parsed.settings) ? parsed.settings : null,
  };

  const payload = isCapitalExport ? scopeToCapital(data, targetCapital) : data;

  const parsedDate = parsed.exportDate ? new Date(parsed.exportDate) : null;
  const exportDate =
    parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

  return {
    payload,
    meta: {
      fileName,
      isCapitalExport,
      scopeLabel:
        asText(rawScope?.label) ||
        (targetCapital ? asText(targetCapital.name) : 'All Data'),
      exportDate: exportDate ? exportDate.toISOString() : null,
      currency: asText(parsed.settings?.currency) || null,
      counts: {
        capitals: payload.capitals.length,
        fund: payload.fund.length,
        sources: payload.sources.length,
        expenses: payload.expenses.length,
        transactions: payload.transactions.length,
      },
    },
  };
};

/* Add incoming records without duplicating IDs.
   - collision "skip": merge mode, keep the existing record.
   - collision "regenerate": replace mode, keep the incoming record under a
     fresh ID if it clashes with something that is staying. */
const addRecords = (
  existing,
  incoming,
  { mapCapitalId, collision = 'skip' } = {}
) => {
  const usedIds = new Set(
    existing.map((item) => asText(item.id)).filter(Boolean)
  );
  const added = [];
  let skipped = 0;

  incoming.forEach((raw) => {
    const originalId = asText(raw.id);
    let id = originalId || makeId();

    if (originalId && usedIds.has(id)) {
      if (collision === 'skip') {
        skipped += 1;
        return;
      }
      id = makeId();
    }

    while (usedIds.has(id)) id = makeId();
    usedIds.add(id);

    const item = { ...raw, id };

    if (mapCapitalId) {
      const mapped = mapCapitalId(raw.capitalId);
      if (mapped) item.capitalId = mapped;
    }

    added.push(item);
  });

  return { added, skipped };
};

const replaceEverything = (current, payload) => {
  const usedCapitalIds = new Set();
  const capitalMap = new Map();

  const capitals = payload.capitals.map((capital) => {
    const originalId = asText(capital.id);
    let id = originalId || makeId();

    while (usedCapitalIds.has(id)) id = makeId();
    usedCapitalIds.add(id);

    if (originalId && !capitalMap.has(originalId)) {
      capitalMap.set(originalId, id);
    }

    return { ...normalizeCapital(capital), id };
  });

  const singleCapitalId = capitals.length === 1 ? capitals[0].id : null;

  const mapCapitalId = (capitalId) => {
    const originalId = asText(capitalId);

    if (originalId && capitalMap.has(originalId)) {
      return capitalMap.get(originalId);
    }

    if (!originalId && singleCapitalId) return singleCapitalId;
    return originalId;
  };

  const fund = addRecords([], payload.fund, { collision: 'regenerate' }).added;
  const sources = addRecords([], payload.sources, {
    mapCapitalId,
    collision: 'regenerate',
  }).added;
  const expenses = addRecords([], payload.expenses, {
    mapCapitalId,
    collision: 'regenerate',
  }).added;
  const transactions = addRecords([], payload.transactions, {
    mapCapitalId,
    collision: 'regenerate',
  }).added;

  return {
    next: {
      capitals,
      fund,
      sources,
      expenses,
      transactions,
      settings: normalizeSettings(payload.settings, current.settings),
    },
    summary: {
      mode: 'replace',
      isCapitalExport: false,
      scopeLabel: 'All Data',
      capitalsAdded: capitals.length,
      capitalsUpdated: 0,
      capitalsReused: 0,
      fundAdded: fund.length,
      fundSkipped: 0,
      sourcesAdded: sources.length,
      sourcesSkipped: 0,
      expensesAdded: expenses.length,
      expensesSkipped: 0,
      transactionsAdded: transactions.length,
      transactionsSkipped: 0,
      settingsApplied: true,
    },
  };
};

const replaceCapital = (current, payload) => {
  const incomingCapital = payload.capitals[0];

  if (!incomingCapital) {
    throw new Error('The capital backup is empty.');
  }

  const incomingId = asText(incomingCapital.id);
  const incomingName = asText(incomingCapital.name);

  let existing = incomingId
    ? current.capitals.find((capital) => asText(capital.id) === incomingId)
    : null;

  if (!existing && incomingName) {
    existing = current.capitals.find(
      (capital) => nameKey(capital.name) === nameKey(incomingName)
    );
  }

  let targetId;
  let capitals;
  let capitalsAdded = 0;
  let capitalsUpdated = 0;

  if (existing) {
    targetId = existing.id;
    capitals = current.capitals.map((capital) =>
      capital.id === targetId
        ? {
            ...capital,
            name: incomingName || capital.name,
            color: asText(incomingCapital.color) || capital.color,
            createdAt: incomingCapital.createdAt || capital.createdAt,
          }
        : capital
    );
    capitalsUpdated = 1;
  } else {
    targetId = incomingId || makeId();
    const usedIds = new Set(
      current.capitals.map((capital) => asText(capital.id))
    );

    while (usedIds.has(targetId)) targetId = makeId();

    capitals = [
      ...current.capitals,
      { ...normalizeCapital(incomingCapital), id: targetId },
    ];
    capitalsAdded = 1;
  }

  const remainingSources = current.sources.filter(
    (source) => source.capitalId !== targetId
  );
  const remainingExpenses = current.expenses.filter(
    (expense) => expense.capitalId !== targetId
  );
  const remainingTransactions = current.transactions.filter(
    (transaction) => transaction.capitalId !== targetId
  );

  const mapCapitalId = () => targetId;

  const sources = addRecords(remainingSources, payload.sources, {
    mapCapitalId,
    collision: 'regenerate',
  }).added;
  const expenses = addRecords(remainingExpenses, payload.expenses, {
    mapCapitalId,
    collision: 'regenerate',
  }).added;
  const transactions = addRecords(remainingTransactions, payload.transactions, {
    mapCapitalId,
    collision: 'regenerate',
  }).added;

  return {
    next: {
      capitals,
      fund: current.fund,
      sources: [...remainingSources, ...sources],
      expenses: [...remainingExpenses, ...expenses],
      transactions: [...remainingTransactions, ...transactions],
      settings: current.settings,
    },
    summary: {
      mode: 'replace',
      isCapitalExport: true,
      scopeLabel: incomingName || existing?.name || 'Capital',
      capitalsAdded,
      capitalsUpdated,
      capitalsReused: 0,
      fundAdded: 0,
      fundSkipped: 0,
      sourcesAdded: sources.length,
      sourcesSkipped: 0,
      expensesAdded: expenses.length,
      expensesSkipped: 0,
      transactionsAdded: transactions.length,
      transactionsSkipped: 0,
      settingsApplied: false,
    },
  };
};

const mergeInto = (current, payload, isCapitalExport) => {
  const capitals = [...current.capitals];
  const usedCapitalIds = new Set(
    current.capitals.map((capital) => asText(capital.id)).filter(Boolean)
  );
  const capitalMap = new Map();

  let capitalsAdded = 0;
  let capitalsReused = 0;

  payload.capitals.forEach((incomingCapital) => {
    const incomingId = asText(incomingCapital.id);
    const incomingName = asText(incomingCapital.name);

    let existing = incomingId
      ? current.capitals.find((capital) => asText(capital.id) === incomingId)
      : null;

    if (!existing && incomingName) {
      existing = current.capitals.find(
        (capital) => nameKey(capital.name) === nameKey(incomingName)
      );
    }

    const mapKey = incomingId || `name:${nameKey(incomingName)}`;

    if (existing) {
      capitalMap.set(mapKey, existing.id);
      capitalsReused += 1;
      return;
    }

    let id = incomingId || makeId();
    while (usedCapitalIds.has(id)) id = makeId();
    usedCapitalIds.add(id);

    capitals.push({ ...normalizeCapital(incomingCapital), id });
    capitalMap.set(mapKey, id);
    capitalsAdded += 1;
  });

  const firstCapital = payload.capitals[0];
  const singleIncomingCapitalId = firstCapital
    ? capitalMap.get(
        asText(firstCapital.id) || `name:${nameKey(firstCapital.name)}`
      ) || null
    : null;

  const mapCapitalId = (capitalId) => {
    if (isCapitalExport && singleIncomingCapitalId) {
      return singleIncomingCapitalId;
    }

    const originalId = asText(capitalId);
    if (originalId && capitalMap.has(originalId)) {
      return capitalMap.get(originalId);
    }

    if (!originalId && singleIncomingCapitalId) {
      return singleIncomingCapitalId;
    }

    return originalId;
  };

  const fundResult = addRecords(current.fund, payload.fund);
  const sourceResult = addRecords(current.sources, payload.sources, {
    mapCapitalId,
  });
  const expenseResult = addRecords(current.expenses, payload.expenses, {
    mapCapitalId,
  });
  const transactionResult = addRecords(
    current.transactions,
    payload.transactions,
    { mapCapitalId }
  );

  return {
    next: {
      capitals,
      fund: [...current.fund, ...fundResult.added],
      sources: [...current.sources, ...sourceResult.added],
      expenses: [...current.expenses, ...expenseResult.added],
      transactions: [...current.transactions, ...transactionResult.added],
      settings: current.settings,
    },
    summary: {
      mode: 'merge',
      isCapitalExport,
      scopeLabel: isCapitalExport
        ? payload.capitals[0]?.name || 'Capital'
        : 'All Data',
      capitalsAdded,
      capitalsUpdated: 0,
      capitalsReused,
      fundAdded: fundResult.added.length,
      fundSkipped: fundResult.skipped,
      sourcesAdded: sourceResult.added.length,
      sourcesSkipped: sourceResult.skipped,
      expensesAdded: expenseResult.added.length,
      expensesSkipped: expenseResult.skipped,
      transactionsAdded: transactionResult.added.length,
      transactionsSkipped: transactionResult.skipped,
      settingsApplied: false,
    },
  };
};

/**
 * Apply a parsed backup to the current state.
 *
 * mode "merge"   - add records, skip IDs that already exist.
 * mode "replace" - full backups replace everything; capital backups replace
 *                  only the matching capital and its records.
 *
 * Returns { next, summary } and never mutates the passed state.
 */
export const applyBackup = (current, payload, options = {}) => {
  const mode = options.mode === 'replace' ? 'replace' : 'merge';
  const scope = isObject(payload?.scope) ? payload.scope : null;
  const isCapitalExport =
    payload?.exportType === 'capital' || scope?.type === 'capital';

  const incoming = {
    ...payload,
    capitals: Array.isArray(payload?.capitals) ? payload.capitals : [],
    fund: Array.isArray(payload?.fund) ? payload.fund : [],
    sources: Array.isArray(payload?.sources) ? payload.sources : [],
    expenses: Array.isArray(payload?.expenses) ? payload.expenses : [],
    transactions: Array.isArray(payload?.transactions)
      ? payload.transactions
      : [],
  };

  if (mode === 'replace') {
    return isCapitalExport
      ? replaceCapital(current, incoming)
      : replaceEverything(current, incoming);
  }

  return mergeInto(current, incoming, isCapitalExport);
};
