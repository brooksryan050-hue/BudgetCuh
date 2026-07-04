import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ChallengeCard } from '@/components/challenges/challenge-card';
import { BadgeCard } from '@/components/challenges/badge-card';
import { LevelCharacterCard } from '@/components/challenges/level-character-card';
import { CHALLENGE_TEMPLATES } from '@/data/challenge-templates';
import { daysUntilTemplateAvailable, isTemplateAvailableToStart } from '@/lib/challenges';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useChallengesWithProgress } from '@/hooks/use-active-challenges';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/budget-store';

export default function ChallengesScreen() {
  const theme = useTheme();
  const referenceDate = useMemo(() => new Date(), []);
  const challenges = useBudgetStore((s) => s.challenges);
  const badges = useBudgetStore((s) => s.badges);
  const startChallenge = useBudgetStore((s) => s.startChallenge);

  const challengesWithProgress = useChallengesWithProgress(referenceDate);
  const active = challengesWithProgress.filter((c) => c.instance.status === 'active');
  const completed = challengesWithProgress.filter((c) => c.instance.status === 'completed');

  const availableTemplates = CHALLENGE_TEMPLATES.filter((t) => isTemplateAvailableToStart(t, challenges, referenceDate));
  const coolingDownTemplates = CHALLENGE_TEMPLATES.filter(
    (t) => !isTemplateAvailableToStart(t, challenges, referenceDate) && !active.some((c) => c.template.id === t.id)
  );
  const earnedBadges = badges.filter((b) => b.earnedAt !== null);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ThemedText type="title" style={styles.title}>
            Challenges
          </ThemedText>

          <LevelCharacterCard />

          {earnedBadges.length > 0 ? (
            <View>
              <SectionHeader title="Your badges" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeRow}>
                {earnedBadges.map((badge) => (
                  <BadgeCard key={badge.key} badge={badge} />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {active.length > 0 ? (
            <View>
              <SectionHeader title="Active challenges" />
              <View style={styles.stack}>
                {active.map(({ instance, template, progress }) => (
                  <ChallengeCard
                    key={instance.id}
                    instance={instance}
                    template={template}
                    progress={progress}
                    onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: instance.id } })}
                  />
                ))}
              </View>
            </View>
          ) : (
            <EmptyState
              icon="flame-outline"
              title="No active challenges"
              message="Start one below to boost your savings this week."
            />
          )}

          <View>
            <SectionHeader title="Try a challenge" />
            <View style={styles.stack}>
              {availableTemplates.map((template) => (
                <Card key={template.id} style={styles.templateCard}>
                  <View style={styles.templateHeader}>
                    <View style={styles.templateText}>
                      <ThemedText type="smallBold">{template.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {template.description}
                      </ThemedText>
                    </View>
                    <Pill label={`${template.points} pts`} selected color={theme.brandSecondary} />
                  </View>
                  <Pill label="Start challenge" selected onPress={() => startChallenge(template.id)} />
                </Card>
              ))}
            </View>
          </View>

          {coolingDownTemplates.length > 0 ? (
            <View>
              <SectionHeader title="Available again soon" />
              <View style={styles.stack}>
                {coolingDownTemplates.map((template) => (
                  <Card key={template.id} style={styles.templateCard}>
                    <View style={styles.templateHeader}>
                      <View style={styles.templateText}>
                        <ThemedText type="smallBold">{template.title}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          Nice work. You can take this on again in{' '}
                          {daysUntilTemplateAvailable(template, challenges, referenceDate)} day
                          {daysUntilTemplateAvailable(template, challenges, referenceDate) === 1 ? '' : 's'}.
                        </ThemedText>
                      </View>
                      <Pill label={`${template.points} pts`} color={theme.brandSecondary} />
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          ) : null}

          {completed.length > 0 ? (
            <View>
              <SectionHeader title="Completed" />
              <View style={styles.stack}>
                {completed.map(({ instance, template, progress }) => (
                  <ChallengeCard
                    key={instance.id}
                    instance={instance}
                    template={template}
                    progress={progress}
                    onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: instance.id } })}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, width: '100%' },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  stack: {
    gap: Spacing.two,
  },
  templateCard: {
    gap: Spacing.two,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  templateText: {
    flex: 1,
    gap: 2,
  },
});
