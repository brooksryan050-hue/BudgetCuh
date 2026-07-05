import { BADGE_CATALOG } from '@/data/badges';
import { DEFAULT_CATEGORIES } from '@/data/categories';
import { getChallengeTemplateById } from '@/data/challenge-templates';
import { BADGE_MIN_ACCOUNT_AGE_DAYS, markBadgesEarned, evaluateBadges } from '@/lib/badges';
import { addDays, toISODate } from '@/lib/dates';
import { flushOutboxGuarded } from '@/lib/sync-engine';
import {
  accountToRow,
  badgeToRow,
  budgetToRow,
  challengeInstanceToRow,
  profileToRow,
  savingsGoalContributionToRow,
  savingsGoalToRow,
  transactionToRow,
  weeklySummaryToRow,
} from '@/lib/sync-rows';
import { createPersistedStore } from '@/store/create-persisted-store';
import { useAuthStore } from '@/store/auth-store';
import type {
  Account,
  Badge,
  Budget,
  Category,
  ChallengeInstance,
  ID,
  ISODate,
  NotificationCard,
  SavingsGoal,
  Transaction,
  UserProfile,
  WeeklySummary,
} from '@/types';
import type { SyncEntity, SyncOp, SyncOpType } from '@/types/sync';

function generateId(prefix: string): ID {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const GOAL_TYPE_META: Record<UserProfile['financialGoalType'], { name: string; icon: string }> = {
  travel: { name: 'Travel', icon: 'airplane' },
  emergency_fund: { name: 'Emergency fund', icon: 'umbrella' },
  rent: { name: 'Rent', icon: 'home' },
  business: { name: 'Business', icon: 'briefcase' },
  school: { name: 'School', icon: 'school' },
  general_savings: { name: 'General savings', icon: 'wallet' },
};

function currentUserId(): string | undefined {
  return useAuthStore.getState().session?.user.id;
}

/** Income adds to a balance, expense subtracts — the signed contribution of one transaction. */
function signedAmount(transaction: Pick<Transaction, 'type' | 'amount'>): number {
  return transaction.type === 'income' ? transaction.amount : -transaction.amount;
}

/**
 * Applies a signed delta to one account's balance — the account the transaction
 * form says the transaction belongs to, or accounts[0] (the "Main Account" from
 * onboarding) when accountId is missing/unrecognized, which covers transactions
 * logged before per-transaction account selection existed. Manually editing the
 * balance (AccountBalanceCard's "Edit balance") still fully overwrites it — this
 * only nudges it incrementally as new transactions are logged, so a manual
 * reconciliation remains the source of truth until the next transaction.
 */
function resolveAccountId(accounts: Account[], accountId: ID | undefined): ID | undefined {
  if (accountId && accounts.some((a) => a.id === accountId)) return accountId;
  return accounts[0]?.id;
}

function applyBalanceDelta(accounts: Account[], accountId: ID | undefined, delta: number, now: string): Account[] {
  if (accounts.length === 0 || delta === 0) return accounts;
  const targetId = resolveAccountId(accounts, accountId);
  return accounts.map((account) =>
    account.id === targetId ? { ...account, balance: account.balance + delta, updatedAt: now } : account
  );
}

interface BudgetState {
  hasHydrated: boolean;
  hasCompletedOnboarding: boolean;
  profile: UserProfile | null;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  challenges: ChallengeInstance[];
  savingsGoals: SavingsGoal[];
  badges: Badge[];
  weeklySummaries: WeeklySummary[];
  points: number;
  notificationCards: NotificationCard[];
  accounts: Account[];
  syncOutbox: SyncOp[];

  completeOnboarding: (
    profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>,
    initialAccount?: { name: string; balance: number }
  ) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;

  addTransaction: (input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => ID;
  /** Same as calling addTransaction in a loop, but runs the O(n) badge evaluation
   * scan exactly once at the end instead of once per item — use for any bulk-add
   * path (e.g. receipt scanning) instead of looping addTransaction. */
  addTransactions: (inputs: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[]) => ID[];
  updateTransaction: (id: ID, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: ID) => void;

  upsertBudget: (categoryId: ID, monthlyLimit: number) => void;
  removeBudget: (id: ID) => void;

  startChallenge: (templateId: ID) => ID;
  recordChallengeCheckIn: (instanceId: ID, date: ISODate) => void;
  claimChallengeReward: (instanceId: ID) => void;

  addSavingsGoal: (input: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt' | 'contributions' | 'currentAmount'>) => ID;
  updateSavingsGoal: (
    id: ID,
    patch: Partial<Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt' | 'contributions' | 'currentAmount'>>
  ) => void;
  contributeSavingsGoal: (goalId: ID, amount: number, date: ISODate) => void;
  deleteSavingsGoal: (id: ID) => void;

  addAccount: (input: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => ID;
  updateAccount: (id: ID, patch: Partial<Account>) => void;
  deleteAccount: (id: ID) => void;

  setNotificationCards: (cards: NotificationCard[]) => void;
  markNotificationRead: (id: string) => void;
  dismissNotification: (id: string) => void;

  closeOutWeek: (weeklySummary: WeeklySummary) => void;
  resetAllData: () => void;

  applyRemoteSnapshot: (patch: Partial<BudgetState>) => void;

  _runBadgeEvaluation: (referenceDate: Date) => void;
  _enqueueSync: (entity: SyncEntity, opType: SyncOpType, recordId: string, payload?: Record<string, unknown>) => void;
  _attemptImmediateFlush: () => void;
  _enqueueProfilePointsSync: () => void;
  _enqueueAccountSync: (accountId: ID | undefined) => void;
  _enqueueBadgeSync: (badgeKey: string) => void;
}

const initialEntityState = {
  hasCompletedOnboarding: false,
  profile: null as UserProfile | null,
  categories: DEFAULT_CATEGORIES,
  transactions: [] as Transaction[],
  budgets: [] as Budget[],
  challenges: [] as ChallengeInstance[],
  savingsGoals: [] as SavingsGoal[],
  badges: BADGE_CATALOG,
  weeklySummaries: [] as WeeklySummary[],
  points: 0,
  notificationCards: [] as NotificationCard[],
  accounts: [] as Account[],
  syncOutbox: [] as SyncOp[],
};

const PERSISTED_KEYS = Object.keys(initialEntityState) as (keyof BudgetState)[];

/** Adds any catalog badges a persisted session predates, without touching earned ones. */
function reconcileBadges(badges: Badge[]): Badge[] {
  const existingKeys = new Set(badges.map((badge) => badge.key));
  const missing = BADGE_CATALOG.filter((badge) => !existingKeys.has(badge.key));
  return missing.length > 0 ? [...badges, ...missing] : badges;
}

/** Adds any catalog categories a persisted session predates (e.g. Online Shopping). */
function reconcileCategories(categories: Category[]): Category[] {
  const existingIds = new Set(categories.map((category) => category.id));
  const missing = DEFAULT_CATEGORIES.filter((category) => !existingIds.has(category.id));
  return missing.length > 0 ? [...categories, ...missing] : categories;
}

/**
 * Clears any badge earned before its minimum-account-age gate existed (or before it
 * was satisfiable) — e.g. from a version of the app that awarded these vacuously on a
 * brand-new, zero-history account. A badge earned at or after the account was old
 * enough to legitimately qualify is left untouched.
 */
function correctPrematurelyEarnedBadges(badges: Badge[], profile: UserProfile | null): Badge[] {
  if (!profile) return badges;
  const createdAt = new Date(profile.createdAt);
  return badges.map((badge) => {
    const minAgeDays = BADGE_MIN_ACCOUNT_AGE_DAYS[badge.key];
    if (!minAgeDays || !badge.earnedAt) return badge;
    const earliestValidEarnDate = addDays(createdAt, minAgeDays);
    return new Date(badge.earnedAt) < earliestValidEarnDate ? { ...badge, earnedAt: null } : badge;
  });
}

export const useBudgetStore = createPersistedStore<BudgetState>(
  'budget-app-storage',
  (set, get) => ({
    hasHydrated: false,
    ...initialEntityState,

    completeOnboarding: (profileInput, initialAccount) => {
        const now = new Date();
        const nowIso = now.toISOString();
        const profile: UserProfile = {
          ...profileInput,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        // New accounts start with no fabricated transaction history, budgets, or
        // challenges — just the profile and one account (the app assumes at least
        // one account always exists), seeded from what the user entered during
        // onboarding's account step. The savings goal the user just set, though,
        // does become a real SavingsGoal entity below so it actually shows up on
        // Home instead of only living as flat fields on the profile.
        const account: Account = {
          id: generateId('account'),
          name: initialAccount?.name.trim() || 'Main Account',
          icon: 'wallet',
          color: '#3C87F7',
          currency: profile.currency,
          balance: initialAccount?.balance ?? 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        const savingsGoals: SavingsGoal[] = [];
        if (profile.savingsGoalAmount > 0) {
          const meta = GOAL_TYPE_META[profile.financialGoalType];
          savingsGoals.push({
            id: generateId('goal'),
            name: meta.name,
            icon: meta.icon,
            targetAmount: profile.savingsGoalAmount,
            currentAmount: 0,
            financialGoalType: profile.financialGoalType,
            createdAt: nowIso,
            updatedAt: nowIso,
            contributions: [],
          });
        }

        set({
          profile,
          hasCompletedOnboarding: true,
          transactions: [],
          budgets: [],
          challenges: [],
          savingsGoals,
          weeklySummaries: [],
          points: 0,
          accounts: [account],
        });

        get()._runBadgeEvaluation(now);
        get()._enqueueSync('profiles', 'upsert', profile.id, profileToRow(profile, get().points));
        const userId = currentUserId();
        if (userId) get()._enqueueSync('accounts', 'upsert', account.id, accountToRow(account, userId));
        if (userId) {
          for (const goal of savingsGoals) {
            get()._enqueueSync('savings_goals', 'upsert', goal.id, savingsGoalToRow(goal, userId));
          }
        }
      },

      updateProfile: (patch) => {
        const { profile, points } = get();
        if (!profile) return;
        const updated: UserProfile = { ...profile, ...patch, updatedAt: new Date().toISOString() };
        set({ profile: updated });
        get()._enqueueSync('profiles', 'upsert', updated.id, profileToRow(updated, points));
      },

      addTransaction: (input) => {
        const now = new Date().toISOString();
        const id = generateId('txn');
        const transaction: Transaction = { ...input, id, createdAt: now, updatedAt: now };
        set((state) => ({
          transactions: [transaction, ...state.transactions],
          accounts: applyBalanceDelta(state.accounts, transaction.accountId, signedAmount(transaction), now),
        }));
        get()._runBadgeEvaluation(new Date());
        const userId = currentUserId();
        if (userId) {
          get()._enqueueSync('transactions', 'upsert', id, transactionToRow(transaction, userId));
          get()._enqueueAccountSync(resolveAccountId(get().accounts, transaction.accountId));
        }
        return id;
      },

      addTransactions: (inputs) => {
        if (inputs.length === 0) return [];
        const now = new Date().toISOString();
        const newTransactions: Transaction[] = inputs.map((input) => ({
          ...input,
          id: generateId('txn'),
          createdAt: now,
          updatedAt: now,
        }));
        set((state) => {
          let accounts = state.accounts;
          for (const transaction of newTransactions) {
            accounts = applyBalanceDelta(accounts, transaction.accountId, signedAmount(transaction), now);
          }
          // Reversed so the final order matches what calling addTransaction once per
          // item (each prepending to the front) would have produced.
          return {
            transactions: [...newTransactions.slice().reverse(), ...state.transactions],
            accounts,
          };
        });
        get()._runBadgeEvaluation(new Date());
        const userId = currentUserId();
        if (userId) {
          const touchedAccountIds = new Set<ID | undefined>();
          for (const transaction of newTransactions) {
            get()._enqueueSync('transactions', 'upsert', transaction.id, transactionToRow(transaction, userId));
            touchedAccountIds.add(resolveAccountId(get().accounts, transaction.accountId));
          }
          touchedAccountIds.forEach((accountId) => get()._enqueueAccountSync(accountId));
        }
        return newTransactions.map((t) => t.id);
      },

      updateTransaction: (id, patch) => {
        const now = new Date().toISOString();
        const previous = get().transactions.find((t) => t.id === id);
        let touchedAccountIds: (ID | undefined)[] = [];
        set((state) => {
          const transactions = state.transactions.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now } : t));
          if (!previous) return { transactions };
          const updated = transactions.find((t) => t.id === id)!;
          const oldAccountId = resolveAccountId(state.accounts, previous.accountId);
          const newAccountId = resolveAccountId(state.accounts, updated.accountId);
          touchedAccountIds = [oldAccountId, newAccountId];

          let accounts = state.accounts;
          if (oldAccountId === newAccountId) {
            const delta = signedAmount(updated) - signedAmount(previous);
            accounts = applyBalanceDelta(accounts, newAccountId, delta, now);
          } else {
            accounts = applyBalanceDelta(accounts, oldAccountId, -signedAmount(previous), now);
            accounts = applyBalanceDelta(accounts, newAccountId, signedAmount(updated), now);
          }
          return { transactions, accounts };
        });
        const updated = get().transactions.find((t) => t.id === id);
        const userId = currentUserId();
        if (updated && userId) {
          get()._enqueueSync('transactions', 'upsert', id, transactionToRow(updated, userId));
          new Set(touchedAccountIds).forEach((accountId) => get()._enqueueAccountSync(accountId));
        }
      },

      deleteTransaction: (id) => {
        const now = new Date().toISOString();
        const existing = get().transactions.find((t) => t.id === id);
        const touchedAccountId = existing ? resolveAccountId(get().accounts, existing.accountId) : undefined;
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
          accounts: existing
            ? applyBalanceDelta(state.accounts, existing.accountId, -signedAmount(existing), now)
            : state.accounts,
        }));
        const userId = currentUserId();
        if (userId) {
          get()._enqueueSync('transactions', 'delete', id);
          if (touchedAccountId) get()._enqueueAccountSync(touchedAccountId);
        }
      },

      upsertBudget: (categoryId, monthlyLimit) => {
        const now = new Date().toISOString();
        set((state) => {
          const existing = state.budgets.find((b) => b.categoryId === categoryId);
          if (existing) {
            return {
              budgets: state.budgets.map((b) =>
                b.categoryId === categoryId ? { ...b, monthlyLimit, updatedAt: now } : b
              ),
            };
          }
          const budget: Budget = {
            id: generateId('budget'),
            categoryId,
            monthlyLimit,
            createdAt: now,
            updatedAt: now,
          };
          return { budgets: [...state.budgets, budget] };
        });
        get()._runBadgeEvaluation(new Date());
        const updated = get().budgets.find((b) => b.categoryId === categoryId);
        const userId = currentUserId();
        if (updated && userId) get()._enqueueSync('budgets', 'upsert', updated.id, budgetToRow(updated, userId));
      },

      removeBudget: (id) => {
        set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }));
        const userId = currentUserId();
        if (userId) get()._enqueueSync('budgets', 'delete', id);
      },

      startChallenge: (templateId) => {
        const template = getChallengeTemplateById(templateId);
        if (!template) return '';
        const now = new Date();
        const nowIso = now.toISOString();
        const instance: ChallengeInstance = {
          id: generateId('challenge'),
          templateId,
          startDate: toISODate(now),
          endDate: toISODate(new Date(now.getTime() + template.durationDays * 86400000)),
          status: 'active',
          checkIns: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        set((state) => ({ challenges: [instance, ...state.challenges] }));
        const userId = currentUserId();
        if (userId) {
          get()._enqueueSync('challenge_instances', 'upsert', instance.id, challengeInstanceToRow(instance, userId));
        }
        return instance.id;
      },

      recordChallengeCheckIn: (instanceId, date) => {
        const now = new Date().toISOString();
        set((state) => ({
          challenges: state.challenges.map((c) =>
            c.id === instanceId && !c.checkIns.includes(date)
              ? { ...c, checkIns: [...c.checkIns, date], updatedAt: now }
              : c
          ),
        }));
        const updated = get().challenges.find((c) => c.id === instanceId);
        const userId = currentUserId();
        if (updated && userId) {
          get()._enqueueSync('challenge_instances', 'upsert', instanceId, challengeInstanceToRow(updated, userId));
        }
      },

      claimChallengeReward: (instanceId) => {
        const state = get();
        const instance = state.challenges.find((c) => c.id === instanceId);
        if (!instance) return;
        const template = getChallengeTemplateById(instance.templateId);
        if (!template) return;

        const now = new Date();
        const nowIso = now.toISOString();
        set((s) => ({
          challenges: s.challenges.map((c) =>
            c.id === instanceId ? { ...c, status: 'completed', completedAt: nowIso, updatedAt: nowIso } : c
          ),
          points: s.points + template.points,
          badges: template.badgeKey ? markBadgesEarned(s.badges, [template.badgeKey], now) : s.badges,
        }));

        const updatedInstance = get().challenges.find((c) => c.id === instanceId);
        const userId = currentUserId();
        if (updatedInstance && userId) {
          get()._enqueueSync(
            'challenge_instances',
            'upsert',
            instanceId,
            challengeInstanceToRow(updatedInstance, userId)
          );
        }
        get()._enqueueProfilePointsSync();
        if (template.badgeKey) get()._enqueueBadgeSync(template.badgeKey);
      },

      addSavingsGoal: (input) => {
        const now = new Date().toISOString();
        const id = generateId('goal');
        const goal: SavingsGoal = {
          ...input,
          id,
          currentAmount: 0,
          createdAt: now,
          updatedAt: now,
          contributions: [],
        };
        set((state) => ({ savingsGoals: [...state.savingsGoals, goal] }));
        const userId = currentUserId();
        if (userId) get()._enqueueSync('savings_goals', 'upsert', id, savingsGoalToRow(goal, userId));
        return id;
      },

      updateSavingsGoal: (id, patch) => {
        const now = new Date().toISOString();
        set((state) => ({
          savingsGoals: state.savingsGoals.map((goal) =>
            goal.id === id ? { ...goal, ...patch, updatedAt: now } : goal
          ),
        }));
        const updated = get().savingsGoals.find((g) => g.id === id);
        const userId = currentUserId();
        if (updated && userId) get()._enqueueSync('savings_goals', 'upsert', id, savingsGoalToRow(updated, userId));
      },

      contributeSavingsGoal: (goalId, amount, date) => {
        const now = new Date().toISOString();
        const contributionId = generateId('contrib');
        set((state) => ({
          savingsGoals: state.savingsGoals.map((goal) =>
            goal.id === goalId
              ? {
                  ...goal,
                  currentAmount: goal.currentAmount + amount,
                  updatedAt: now,
                  contributions: [...goal.contributions, { id: contributionId, amount, date }],
                }
              : goal
          ),
        }));
        get()._runBadgeEvaluation(new Date());

        const updated = get().savingsGoals.find((g) => g.id === goalId);
        const userId = currentUserId();
        if (updated && userId) {
          get()._enqueueSync('savings_goals', 'upsert', goalId, savingsGoalToRow(updated, userId));
          get()._enqueueSync(
            'savings_goal_contributions',
            'upsert',
            contributionId,
            savingsGoalContributionToRow({ id: contributionId, amount, date }, goalId, userId)
          );
        }
      },

      deleteSavingsGoal: (id) => {
        set((state) => ({ savingsGoals: state.savingsGoals.filter((g) => g.id !== id) }));
        const userId = currentUserId();
        if (userId) get()._enqueueSync('savings_goals', 'delete', id);
      },

      addAccount: (input) => {
        const now = new Date().toISOString();
        const id = generateId('account');
        const account: Account = { ...input, id, createdAt: now, updatedAt: now };
        set((state) => ({ accounts: [...state.accounts, account] }));
        const userId = currentUserId();
        if (userId) get()._enqueueSync('accounts', 'upsert', id, accountToRow(account, userId));
        return id;
      },

      updateAccount: (id, patch) => {
        const now = new Date().toISOString();
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: now } : a)),
        }));
        const updated = get().accounts.find((a) => a.id === id);
        const userId = currentUserId();
        if (updated && userId) get()._enqueueSync('accounts', 'upsert', id, accountToRow(updated, userId));
      },

      deleteAccount: (id) => {
        const hadMultiple = get().accounts.length > 1;
        set((state) =>
          state.accounts.length <= 1
            ? state
            : { accounts: state.accounts.filter((a) => a.id !== id) }
        );
        const userId = currentUserId();
        if (userId && hadMultiple) get()._enqueueSync('accounts', 'delete', id);
      },

      setNotificationCards: (cards) => set({ notificationCards: cards }),

      markNotificationRead: (id) => {
        set((state) => ({
          notificationCards: state.notificationCards.map((c) => (c.id === id ? { ...c, read: true } : c)),
        }));
      },

      dismissNotification: (id) => {
        set((state) => ({ notificationCards: state.notificationCards.filter((c) => c.id !== id) }));
      },

      closeOutWeek: (weeklySummary) => {
        const alreadyExists = get().weeklySummaries.some((w) => w.weekStartDate === weeklySummary.weekStartDate);
        if (alreadyExists) return;
        set((state) => ({ weeklySummaries: [...state.weeklySummaries, weeklySummary] }));
        const userId = currentUserId();
        if (userId) {
          get()._enqueueSync('weekly_summaries', 'upsert', weeklySummary.id, weeklySummaryToRow(weeklySummary, userId));
        }
      },

      resetAllData: () => set({ ...initialEntityState }),

      applyRemoteSnapshot: (patch) => set(patch),

      _runBadgeEvaluation: (referenceDate) => {
        const state = get();
        const newlyEarned = evaluateBadges({
          transactions: state.transactions,
          budgets: state.budgets,
          profile: state.profile,
          savingsGoals: state.savingsGoals,
          challenges: state.challenges,
          weeklySummaries: state.weeklySummaries,
          points: state.points,
          badges: state.badges,
          referenceDate,
        });
        if (newlyEarned.length > 0) {
          set((s) => ({ badges: markBadgesEarned(s.badges, newlyEarned, referenceDate) }));
          newlyEarned.forEach((key) => get()._enqueueBadgeSync(key));
        }
      },

      _enqueueSync: (entity, opType, recordId, payload) => {
        const op: SyncOp = {
          id: generateId('sync'),
          entity,
          opType,
          recordId,
          payload,
          createdAt: new Date().toISOString(),
          attempts: 0,
        };
        set((state) => ({ syncOutbox: [...state.syncOutbox, op] }));
        get()._attemptImmediateFlush();
      },

      _attemptImmediateFlush: () => {
        if (!currentUserId()) return;
        const ops = get().syncOutbox;
        if (ops.length === 0) return;
        flushOutboxGuarded(ops).then((remaining) => {
          if (remaining !== null) set({ syncOutbox: remaining });
        });
      },

      _enqueueProfilePointsSync: () => {
        const { profile, points } = get();
        const userId = currentUserId();
        if (!profile || !userId) return;
        get()._enqueueSync('profiles', 'upsert', profile.id, profileToRow(profile, points));
      },

      _enqueueBadgeSync: (badgeKey) => {
        const userId = currentUserId();
        const badge = get().badges.find((b) => b.key === badgeKey);
        if (!userId || !badge?.earnedAt) return;
        get()._enqueueSync('user_badges', 'upsert', `${userId}:${badgeKey}`, badgeToRow(badgeKey, badge.earnedAt, userId));
      },

      _enqueueAccountSync: (accountId) => {
        const userId = currentUserId();
        const account = get().accounts.find((a) => a.id === accountId);
        if (!userId || !account) return;
        get()._enqueueSync('accounts', 'upsert', account.id, accountToRow(account, userId));
      },
  }),
  PERSISTED_KEYS,
  (state) => ({
    ...state,
    badges: correctPrematurelyEarnedBadges(reconcileBadges(state.badges), state.profile),
    categories: reconcileCategories(state.categories),
  })
);
