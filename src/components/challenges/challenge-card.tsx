import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Spacing } from '@/constants/theme';
import { fromISODate, formatShortDate } from '@/lib/dates';
import { useTheme } from '@/hooks/use-theme';
import type { ChallengeDifficulty, ChallengeInstance, ChallengeProgress, ChallengeTemplate } from '@/types';

const DIFFICULTY_COLOR: Record<ChallengeDifficulty, string> = {
  easy: '#1FAA59',
  medium: '#F5A623',
  hard: '#E5484D',
};

export function ChallengeCard({
  instance,
  template,
  progress,
  onPress,
}: {
  instance: ChallengeInstance;
  template: ChallengeTemplate;
  progress: ChallengeProgress;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const isCompleted = instance.status === 'completed';

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleColumn}>
          <ThemedText type="smallBold">{template.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {template.description}
          </ThemedText>
        </View>
        <Pill label={template.difficulty} color={DIFFICULTY_COLOR[template.difficulty]} selected />
      </View>

      {isCompleted ? (
        <View style={styles.completedRow}>
          <Ionicons name="checkmark-circle" size={18} color={theme.success} />
          <ThemedText type="small" style={{ color: theme.success }}>
            Completed — {template.points} pts earned
          </ThemedText>
        </View>
      ) : (
        <>
          <ProgressBar progress={progress.pctComplete} color={theme.brand} />
          <View style={styles.footerRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Ends {formatShortDate(fromISODate(instance.endDate))}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {Math.round(progress.pctComplete)}% complete
            </ThemedText>
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
