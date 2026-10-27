/* Sample notebook data - mirrors the Next.js app's dummy data */
export const generateDummyData = () => {
  const minBagId = 'min-bag-id';
  const pocketId = 'pocket-id';
  const savingsId = 'savings-id';
  const emergencyId = 'emergency-id';

  const capitals = [
    { id: minBagId, name: 'Primary Wallet', color: 'indigo', createdAt: '2026-01-08T07:00:00.000Z' },
    { id: pocketId, name: 'Daily Pocket Cash', color: 'emerald', createdAt: '2026-01-08T07:10:00.000Z' },
    { id: savingsId, name: 'Personal Savings', color: 'amber', createdAt: '2026-01-08T07:20:00.000Z' },
    { id: emergencyId, name: 'Emergency Fund', color: 'rose', createdAt: '2026-01-08T07:30:00.000Z' },
  ];

  const sources = [
    // Primary Wallet
    { id: 's1', capitalId: minBagId, title: 'Salary Withdrawal', breakdown: '\u20B95000', amount: 5000, date: '2026-01-08T08:00:00.000Z' },
    { id: 's2', capitalId: minBagId, title: 'Loose Change Collection', breakdown: '\u20B9120', amount: 120, date: '2026-01-08T08:30:00.000Z' },

    // Pocket
    { id: 's3', capitalId: pocketId, title: 'Daily Pocket Allocation', breakdown: '\u20B9600', amount: 600, date: '2026-01-08T09:00:00.000Z' },
    { id: 's4', capitalId: pocketId, title: 'Extra Cash Added', breakdown: '\u20B9200', amount: 200, date: '2026-01-09T09:00:00.000Z' },

    // Savings
    { id: 's5', capitalId: savingsId, title: 'Monthly Savings Deposit', breakdown: '\u20B93000', amount: 3000, date: '2026-01-08T10:00:00.000Z' },
    { id: 's6', capitalId: savingsId, title: 'Interest Credit', breakdown: '\u20B9150', amount: 150, date: '2026-01-15T10:00:00.000Z' },

    // Emergency
    { id: 's7', capitalId: emergencyId, title: 'Emergency Fund Setup', breakdown: '\u20B92000', amount: 2000, date: '2026-01-08T11:00:00.000Z' },
  ];

  const expenses = [
    // Pocket
    { id: 'e1', capitalId: pocketId, title: 'Breakfast', reason: 'Food', amount: 50, date: '2026-01-08T10:00:00.000Z', beforeBalance: 600, afterBalance: 550 },
    { id: 'e2', capitalId: pocketId, title: 'Bus Fare', reason: 'Transport', amount: 40, date: '2026-01-08T11:00:00.000Z', beforeBalance: 550, afterBalance: 510 },
    { id: 'e3', capitalId: pocketId, title: 'Lunch', reason: 'Food', amount: 120, date: '2026-01-08T14:00:00.000Z', beforeBalance: 510, afterBalance: 390 },
    { id: 'e4', capitalId: pocketId, title: 'Evening Snacks', reason: 'Food', amount: 60, date: '2026-01-08T18:00:00.000Z', beforeBalance: 390, afterBalance: 330 },

    // Primary Wallet
    { id: 'e5', capitalId: minBagId, title: 'Groceries', reason: 'Household', amount: 850, date: '2026-01-09T09:00:00.000Z', beforeBalance: 5120, afterBalance: 4270 },
    { id: 'e6', capitalId: minBagId, title: 'Electricity Bill', reason: 'Utilities', amount: 620, date: '2026-01-10T10:00:00.000Z', beforeBalance: 4270, afterBalance: 3650 },
    { id: 'e7', capitalId: minBagId, title: 'Internet Recharge', reason: 'Utilities', amount: 499, date: '2026-01-11T10:00:00.000Z', beforeBalance: 3650, afterBalance: 3151 },

    // Savings
    { id: 'e8', capitalId: savingsId, title: 'Fixed Deposit Investment', reason: 'Investment', amount: 1000, date: '2026-01-12T12:00:00.000Z', beforeBalance: 3150, afterBalance: 2150 },

    // Emergency
    { id: 'e9', capitalId: emergencyId, title: 'Medical Expense', reason: 'Healthcare', amount: 450, date: '2026-01-13T20:00:00.000Z', beforeBalance: 2000, afterBalance: 1550 },
  ];

  const transactions = [
    // Credits
    { id: 't1', type: 'CREDIT', capitalId: minBagId, amount: 5000, balanceBefore: 0, balanceAfter: 5000, date: '2026-01-08T08:00:00.000Z', note: 'Salary Withdrawal', referenceId: 's1' },
    { id: 't2', type: 'CREDIT', capitalId: minBagId, amount: 120, balanceBefore: 5000, balanceAfter: 5120, date: '2026-01-08T08:30:00.000Z', note: 'Loose Change Collection', referenceId: 's2' },
    { id: 't3', type: 'CREDIT', capitalId: pocketId, amount: 600, balanceBefore: 0, balanceAfter: 600, date: '2026-01-08T09:00:00.000Z', note: 'Daily Pocket Allocation', referenceId: 's3' },
    { id: 't4', type: 'CREDIT', capitalId: savingsId, amount: 3000, balanceBefore: 0, balanceAfter: 3000, date: '2026-01-08T10:00:00.000Z', note: 'Monthly Savings Deposit', referenceId: 's5' },
    { id: 't5', type: 'CREDIT', capitalId: emergencyId, amount: 2000, balanceBefore: 0, balanceAfter: 2000, date: '2026-01-08T11:00:00.000Z', note: 'Emergency Fund Setup', referenceId: 's7' },

    // Pocket Debits
    { id: 't6', type: 'DEBIT', capitalId: pocketId, amount: 50, balanceBefore: 600, balanceAfter: 550, date: '2026-01-08T10:00:00.000Z', note: 'Breakfast', referenceId: 'e1' },
    { id: 't7', type: 'DEBIT', capitalId: pocketId, amount: 40, balanceBefore: 550, balanceAfter: 510, date: '2026-01-08T11:00:00.000Z', note: 'Bus Fare', referenceId: 'e2' },
    { id: 't8', type: 'DEBIT', capitalId: pocketId, amount: 120, balanceBefore: 510, balanceAfter: 390, date: '2026-01-08T14:00:00.000Z', note: 'Lunch', referenceId: 'e3' },
    { id: 't9', type: 'DEBIT', capitalId: pocketId, amount: 60, balanceBefore: 390, balanceAfter: 330, date: '2026-01-08T18:00:00.000Z', note: 'Evening Snacks', referenceId: 'e4' },

    // Primary Wallet Debits
    { id: 't10', type: 'DEBIT', capitalId: minBagId, amount: 850, balanceBefore: 5120, balanceAfter: 4270, date: '2026-01-09T09:00:00.000Z', note: 'Groceries', referenceId: 'e5' },
    { id: 't11', type: 'DEBIT', capitalId: minBagId, amount: 620, balanceBefore: 4270, balanceAfter: 3650, date: '2026-01-10T10:00:00.000Z', note: 'Electricity Bill', referenceId: 'e6' },
    { id: 't12', type: 'DEBIT', capitalId: minBagId, amount: 499, balanceBefore: 3650, balanceAfter: 3151, date: '2026-01-11T10:00:00.000Z', note: 'Internet Recharge', referenceId: 'e7' },

    // Savings & Emergency
    { id: 't13', type: 'DEBIT', capitalId: savingsId, amount: 1000, balanceBefore: 3150, balanceAfter: 2150, date: '2026-01-12T12:00:00.000Z', note: 'Fixed Deposit Investment', referenceId: 'e8' },
    { id: 't14', type: 'DEBIT', capitalId: emergencyId, amount: 450, balanceBefore: 2000, balanceAfter: 1550, date: '2026-01-13T20:00:00.000Z', note: 'Medical Expense', referenceId: 'e9' },
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return { capitals, fund: [], sources, expenses, transactions };
};
