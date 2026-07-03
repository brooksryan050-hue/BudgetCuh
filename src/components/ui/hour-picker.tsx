import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Pill } from '@/components/ui/pill';
import { formatReminderHour } from '@/lib/notifications-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

type HourPickerProps = {
  value: number;
  onChange: (hour: number) => void;
};

export function HourPicker({ value, onChange }: HourPickerProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  function selectHour(hour: number) {
    onChange(hour);
    setVisible(false);
  }

  return (
    <>
      <Pressable
        style={[styles.field, { backgroundColor: theme.backgroundElement }]}
        onPress={() => setVisible(true)}>
        <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
        <ThemedText type="smallBold">{formatReminderHour(value)}</ThemedText>
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: theme.overlay }]} onPress={() => setVisible(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.background }]}
            onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.sheetTitle}>
              Reminder time
            </ThemedText>
            <ScrollView style={styles.sheetScroll}>
              <View style={styles.grid}>
                {HOURS.map((hour) => (
                  <Pill
                    key={hour}
                    label={formatReminderHour(hour)}
                    selected={value === hour}
                    onPress={() => selectHour(hour)}
                  />
                ))}
              </View>
            </ScrollView>
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
    paddingVertical: Spacing.two,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '75%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.four,
  },
  sheetTitle: {
    marginBottom: Spacing.two,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: Spacing.two,
  },
});
