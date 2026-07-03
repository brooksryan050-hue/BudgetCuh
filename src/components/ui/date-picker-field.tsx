import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { fromISODate, formatFullDate, formatMonthLabel, toISODate } from '@/lib/dates';
import { useTheme } from '@/hooks/use-theme';
import type { ISODate } from '@/types';

type QuickPick = { label: string; date: Date };

type DatePickerFieldProps = {
  value: ISODate;
  onChange: (date: ISODate) => void;
  /** Defaults to today (no future dates) — matches the transaction-entry use case. */
  maxDate?: Date;
  /** Defaults to no lower bound. Pass `new Date()` to block past dates (e.g. goal deadlines). */
  minDate?: Date;
  /** Defaults to Today/Yesterday. Pass custom shortcuts for future-leaning pickers. */
  quickPicks?: QuickPick[];
};

function addDaysLocal(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function DatePickerField({ value, onChange, maxDate, minDate, quickPicks }: DatePickerFieldProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const selectedDate = fromISODate(value);
  const [viewMonth, setViewMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const today = new Date();
  const upperBound = maxDate ?? today;
  const lowerBound = minDate ?? null;
  const picks =
    quickPicks ??
    [
      { label: 'Today', date: today },
      { label: 'Yesterday', date: addDaysLocal(today, -1) },
    ];

  const firstDayOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const leadingBlanks = (firstDayOfMonth.getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function selectQuickDate(date: Date) {
    onChange(toISODate(date));
    setVisible(false);
  }

  function selectDay(day: number) {
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    if (date > upperBound) return;
    if (lowerBound && date < lowerBound) return;
    onChange(toISODate(date));
    setVisible(false);
  }

  return (
    <>
      <Pressable
        style={[styles.field, { backgroundColor: theme.backgroundElement }]}
        onPress={() => setVisible(true)}>
        <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
        <ThemedText type="default">{formatFullDate(selectedDate)}</ThemedText>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: theme.overlay }]} onPress={() => setVisible(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.background }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.quickRow}>
              {picks.map((pick) => (
                <Pressable
                  key={pick.label}
                  style={[styles.quickPick, { backgroundColor: theme.backgroundElement }]}
                  onPress={() => selectQuickDate(pick.date)}>
                  <ThemedText type="smallBold">{pick.label}</ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.monthRow}>
              <Pressable
                hitSlop={8}
                onPress={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}>
                <Ionicons name="chevron-back" size={20} color={theme.text} />
              </Pressable>
              <ThemedText type="smallBold">{formatMonthLabel(viewMonth)}</ThemedText>
              <Pressable
                hitSlop={8}
                onPress={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}>
                <Ionicons name="chevron-forward" size={20} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => (
                <ThemedText key={i} type="small" themeColor="textSecondary" style={styles.weekdayLabel}>
                  {label}
                </ThemedText>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, index) => {
                if (day === null) return <View key={index} style={styles.cell} />;
                const cellDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
                const isSelected = toISODate(cellDate) === value;
                const isDisabled = cellDate > upperBound || (lowerBound !== null && cellDate < lowerBound);
                return (
                  <Pressable
                    key={index}
                    disabled={isDisabled}
                    onPress={() => selectDay(day)}
                    style={[
                      styles.cell,
                      styles.dayCell,
                      isSelected && { backgroundColor: theme.brand },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{
                        color: isSelected ? '#ffffff' : isDisabled ? theme.textSecondary : theme.text,
                        opacity: isDisabled ? 0.4 : 1,
                      }}>
                      {day}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  quickPick: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCell: {
    borderRadius: Radius.full,
  },
});
