import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={[styles.overlay, { backgroundColor: theme.overlay }]} onPress={onCancel}>
        <Pressable
          style={[styles.dialog, { backgroundColor: theme.background }]}
          onPress={(e) => e.stopPropagation()}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          {message ? (
            <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
              {message}
            </ThemedText>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, { backgroundColor: theme.backgroundElement }]}
              onPress={onCancel}>
              <ThemedText type="smallBold">{cancelLabel}</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.button, { backgroundColor: destructive ? theme.danger : theme.brand }]}
              onPress={onConfirm}>
              <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                {confirmLabel}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
  },
  message: {
    marginBottom: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
});
