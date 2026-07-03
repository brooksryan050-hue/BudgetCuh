import { BADGE_CATALOG } from '@/data/badges';
import { DEFAULT_CATEGORIES } from '@/data/categories';
import { getChallengeTemplateById } from '@/data/challenge-templates';
import { buildSeedData } from '@/data/seed';
import { markBadgesEarned, evaluateBadges } from '@/lib/badges';
import { toISODate } from '@/lib/dates';
import { createPersistedStore } from '@/store/create-persisted-store';
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

function generateId(prefix: string): ID {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface BudgetState {
  hasHydrated: boolean;
  hasCompletedOnboarding: boolean;
  seedApplied: boolean;
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

  completeOnboarding: (profile: Omit<UserProfile, 'id' | 'createdAt'>) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;

  addTransaction: (input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => ID;
  updateTransaction: (id: ID, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: ID) => void;

  upsertBudget: (categoryId: ID, monthlyLimit: number) => void;
  removeBudget: (id: ID) => void;

  startChallenge: (templateId: ID) => ID;
  recordChallengeCheckIn: (instanceId: ID, date: ISODate) => void;
  claimChallengeReward: (instanceId: ID) => void;

  addSavingsGoal: (input: Omit<SavingsGoal, 'id' | 'createdAt' | 'contributions' | 'currentAmount'>) => ID;
  updateSavingsGoal: (
    id: ID,
    patch: Partial<Omit<SavingsGoal, 'id' | 'createdAt' | 'contributions' | 'currentAmount'>>
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

  /** Dev-mode helper: jumps points straight to a level's threshold to preview character unlocks. */
  devSetPoints: (points: number) => void;

  _runBadgeEvaluation: (referenceDate: Date) => void;
}

const initialEntityState = {
  hasCompletedOnboarding: false,
  seedApplied: false,
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
};

const PERSISTED_KEYS = Object.keys(initialEntityState) as (keyof BudgetState)[];

/** Adds any catalog badges a persisted session predates, without touching earned ones. */
function reconcileBadges(badges: Badge[]): Badge[] {
  const existingKeys = new Set(badges.map((badge) => badge.key));
  const missing = BADGE_CATALOG.filter((badge) => !existingKeys.has(badge.key));
  return missing.length > 0 ? [...badges, ...missing] : badges;
}

export const useBudgetStore = createPersistedStore<BudgetState>(
  'budget-app-storage',
  (set, get) => ({
    hasHydrated: false,
    ...initialEntityState,

    completeOnboarding: (profileInput) => {
        const now = new Date();
        const profile: UserProfile = {
          ...profileInput,
          id: generateId('user'),
          createdAt: now.toISOString(),
        };

        const seed = buildSeedData(profile, now);

        const completedTemplates = seed.challenges
          .filter((c) => c.status === 'completed')
          .map((c) => getChallengeTemplateById(c.templateId))
          .filter((t): t is NonNullable<typeof t> => t !== undefined);
        const seedPoints = completedTemplates.reduce((sum, t) => sum + t.points, 0);
        const seedBadgeKeys = completedTemplates
          .map((t) => t.badgeKey)
          .filter((key): key is NonNullable<typeof key> => key !== undefined);

        set({
          profile,
          hasCompletedOnboarding: true,
          seedApplied: true,
          transactions: seed.transactions,
          budgets: seed.budgets,
          challenges: seed.challenges,
          savingsGoals: seed.savingsGoals,
          weeklySummaries: seed.weeklySummaries,
          points: seedPoints,
          badges: markBadgesEarned(get().badges, seedBadgeKeys, now),
          accounts: seed.accounts,
        });

        get()._runBadgeEvaluation(now);
      },

      updateProfile: (patch) => {
        const { profile } = get();
        if (!profile) return;
        set({ profile: { ...profile, ...patch } });
      },

      addTransaction: (input) => {
        const now = new Date().toISOString();
        const id = generateId('txn');
        const transaction: Transaction = { ...input, id, createdAt: now, updatedAt: now };
        set((state) => ({ transactions: [transaction, ...state.transactions] }));
        get()._runBadgeEvaluation(new Date());
        return id;
      },

      updateTransaction: (id, patch) => {
        const now = new Date().toISOString();
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: now } : t
          ),
        }));
      },

      deleteTransaction: (id) => {
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
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
      },

      removeBudget: (id) => {
        set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }));
      },

      startChallenge: (templateId) => {
        const template = getChallengeTemplateById(templateId);
        if (!template) return '';
        const now = new Date();
        const instance: ChallengeInstance = {
          id: generateId('challenge'),
          templateId,
          startDate: toISODate(now),
          endDate: toISODate(new Date(now.getTime() + template.durationDays * 86400000)),
          status: 'active',
          checkIns: [],
        };
        set((state) => ({ challenges: [instance, ...state.challenges] }));
        return instance.id;
      },

      recordChallengeCheckIn: (instanceId, date) => {
        set((state) => ({
          challenges: state.challenges.map((c) =>
            c.id === instanceId && !c.checkIns.includes(date)
              ? { ...c, checkIns: [...c.checkIns, date] }
              : c
          ),
        }));
      },

      claimChallengeReward: (instanceId) => {
        const state = get();
        const instance = state.challenges.find((c) => c.id === instanceId);
        if (!instance) return;
        const template = getChallengeTemplateById(instance.templateId);
        if (!template) return;

        const now = new Date();
        set((s) => ({
          challenges: s.challenges.map((c) =>
            c.id === instanceId ? { ...c, status: 'completed', completedAt: now.toISOString() } : c
          ),
          points: s.points + template.points,
          badges: template.badgeKey ? markBadgesEarned(s.badges, [template.badgeKey], now) : s.badges,
        }));
      },

      addSavingsGoal: (input) => {
        const now = new Date().toISOString();
        const id = generateId('goal');
        const goal: SavingsGoal = { ...input, id, currentAmount: 0, createdAt: now, contributions: [] };
        set((state) => ({ savingsGoals: [...state.savingsGoals, goal] }));
        return id;
      },

      updateSavingsGoal: (id, patch) => {
        set((state) => ({
          savingsGoals: state.savingsGoals.map((goal) => (goal.id === id ? { ...goal, ...patch } : goal)),
        }));
      },

      contributeSavingsGoal: (goalId, amount, date) => {
        set((state) => ({
          savingsGoals: state.savingsGoals.map((goal) =>
            goal.id === goalId
              ? {
                  ...goal,
                  currentAmount: goal.currentAmount + amount,
                  contributions: [...goal.contributions, { id: generateId('contrib'), amount, date }],
                }
              : goal
          ),
        }));
        get()._runBadgeEvaluation(new Date());
      },

      deleteSavingsGoal: (id) => {
        set((state) => ({ savingsGoals: state.savingsGoals.filter((g) => g.id !== id) }));
      },

      addAccount: (input) => {
        const now = new Date().toISOString();
        const id = generateId('account');
        const account: Account = { ...input, id, createdAt: now, updatedAt: now };
        set((state) => ({ accounts: [...state.accounts, account] }));
        return id;
      },

      updateAccount: (id, patch) => {
        const now = new Date().toISOString();
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: now } : a)),
        }));
      },

      deleteAccount: (id) => {
        set((state) =>
          state.accounts.length <= 1
            ? state
            : { accounts: state.accounts.filter((a) => a.id !== id) }
        );
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
        set((state) => {
          const alreadyExists = state.weeklySummaries.some(
            (w) => w.weekStartDate === weeklySummary.weekStartDate
          );
          if (alreadyExists) return state;
          return { weeklySummaries: [...state.weeklySummaries, weeklySummary] };
        });
      },

      resetAllData: () => set({ ...initialEntityState }),

      devSetPoints: (points) => {
        set({ points });
        get()._runBadgeEvaluation(new Date());
      },

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
        }
      },
  }),
  PERSISTED_KEYS,
  (state) => ({ ...state, badges: reconcileBadges(state.badges) })
);
