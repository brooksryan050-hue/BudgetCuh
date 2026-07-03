import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { getLevelCharacter } from '@/data/level-characters';
import { Radius, Spacing } from '@/constants/theme';
import { useLevel } from '@/hooks/use-level';
import { useTheme } from '@/hooks/use-theme';

export function LevelCharacterCard() {
  const theme = useTheme();
  const { level, pctToNext, pointsNeeded } = useLevel();
  const character = getLevelCharacter(level);
  const nextCharacter = getLevelCharacter(level + 1);
  const isMaxLevel = level >= 10;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.emojiCircle, { backgroundColor: theme.brandSecondary + '26' }]}>
          <ThemedText style={styles.emoji}>{character.emoji}</ThemedText>
        </View>
        <View style={styles.textColumn}>
          <ThemedText type="smallBold">{character.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {character.tagline}
          </ThemedText>
        </View>
      </View>

      {!isMaxLevel ? (
        <>
          <ProgressBar progress={pctToNext} color={theme.brandSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            {pointsNeeded} pts to unlock {nextCharacter.emoji} {nextCharacter.name}
          </ThemedText>
        </>
      ) : (
        <ThemedText type="small" style={{ color: theme.success }}>
          You&apos;ve unlocked every character. Legendary.
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  emojiCircle: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
});
