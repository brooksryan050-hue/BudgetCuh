import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { MaxContentWidth, Spacing, type ThemeColor } from '@/constants/theme';
import { useLatestNudge, useRecentNudges } from '@/hooks/use-ai-nudges';
import { useStreaks } from '@/hooks/use-streaks';
import { useTheme } from '@/hooks/use-theme';
import type { NudgeTone } from '@/types';

const TONE_META: Record<NudgeTone, { color: ThemeColor; icon: keyof typeof Ionicons.glyphMap }> = {
  celebratory: { color: 'success', icon: 'sparkles' },
  encouraging: { color: 'brand', icon: 'trending-up' },
  concerned: { color: 'danger', icon: 'alert-circle' },
  neutral: { color: 'textSecondary', icon: 'chatbubble-ellipses' },
};

export default function CoachScreen() {
  const theme = useTheme();
  const referenceDate = useMemo(() => new Date(), []);
  const { dailyDisciplineStreak } = useStreaks(referenceDate);
  const { nudge, loading, generating, error, refresh } = useLatestNudge({ fillInIfMissing: true });
  const { nudges: recentNudges } = useRecentNudges();

  const history = recentNudges.filter((n) => n.id !== nudge?.id);
  const toneMeta = TONE_META[nudge?.tone ?? 'neutral'];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold">Coach</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.textSecondary} />}>
          <Card style={styles.streakCard}>
            <Ionicons name="flame" size={28} color={theme.warning} />
            <View>
              <ThemedText type="subtitle" style={styles.streakNumber}>
                {dailyDisciplineStreak}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                day discipline streak
              </ThemedText>
            </View>
          </Card>

          {generating ? (
            <View style={styles.generatingRow}>
              <Ionicons name="sparkles" size={16} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                Getting today&apos;s tip ready…
              </ThemedText>
            </View>
          ) : null}

          {nudge ? (
            <Card style={styles.nudgeCard}>
              <View style={styles.nudgeHeader}>
                <View style={[styles.toneBadge, { backgroundColor: theme[toneMeta.color] }]}>
                  <Ionicons name={toneMeta.icon} size={18} color="#ffffff" />
                </View>
                <ThemedText type="smallBold" style={styles.nudgeTitle} numberOfLines={2}>
                  {nudge.title}
                </ThemedText>
              </View>
              <ThemedText type="default">{nudge.message}</ThemedText>
            </Card>
          ) : !generating && error ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Couldn't load your coach right now"
              message="Something went wrong fetching your tip — try again later."
            />
          ) : !generating ? (
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title="Your coach is getting to know you"
              message="Check back tomorrow for your first personalized tip."
            />
          ) : null}

          {history.length > 0 ? (
            <View>
              <SectionHeader title="Past tips" />
              <View style={styles.historyList}>
                {history.map((item) => {
                  const meta = TONE_META[item.tone];
                  return (
                    <Card key={item.id} style={styles.historyCard}>
                      <View style={styles.historyRow}>
                        <View style={[styles.toneDot, { backgroundColor: theme[meta.color] }]} />
                        <ThemedText type="smallBold" numberOfLines={1} style={styles.historyTitle}>
                          {item.title}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.generatedDate}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
                        {item.message}
                      </ThemedText>
                    </Card>
                  );
                })}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  streakNumber: {
    fontSize: 28,
    lineHeight: 34,
  },
  generatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  nudgeCard: {
    gap: Spacing.two,
  },
  nudgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  toneBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeTitle: {
    flex: 1,
  },
  historyList: {
    gap: Spacing.two,
  },
  historyCard: {
    gap: Spacing.one,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  toneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyTitle: {
    flex: 1,
  },
});
