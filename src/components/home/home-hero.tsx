import { useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { IconActionButton } from '@/components/ui/icon-action-button';
import { PillSearchInput } from '@/components/ui/pill-search-input';
import { HomeHeroGradient, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { playTapSound } from '@/lib/sound';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/budget-store';

function tap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  playTapSound();
}

type HomeHeroProps = {
  balanceLabel: string;
  balanceValue: string;
  searchValue: string;
  onSearchChange: (text: string) => void;
  onStatsPress: () => void;
  onLedgerPress: () => void;
  onAccountsPress: () => void;
};

const FROSTED_BUTTON_BG = 'rgba(255,255,255,0.16)';

function AvatarMenuRow({
  icon,
  label,
  destructive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const color = destructive ? theme.danger : theme.text;
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <Ionicons name={icon} size={20} color={color} />
      <ThemedText type="default" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function HomeHero({
  balanceLabel,
  balanceValue,
  searchValue,
  onSearchChange,
  onStatsPress,
  onLedgerPress,
  onAccountsPress,
}: HomeHeroProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useBudgetStore((s) => s.profile);
  const updateProfile = useBudgetStore((s) => s.updateProfile);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [pendingSource, setPendingSource] = useState<'camera' | 'library' | null>(null);

  // Closing the sheet and immediately presenting the camera/library picker in the
  // same tick means the picker tries to appear while the sheet's own fade-out
  // animation is still running — on iOS that silently swallows the presentation,
  // so tapping "Take photo"/"Choose from library" appeared to do nothing. Rather
  // than guess at a delay, defer to the Modal's own onDismiss callback, which
  // fires only once the close animation has actually finished. onDismiss is
  // iOS-only (see react-native's Modal.js), so Android falls back to a short delay.
  function selectSource(source: 'camera' | 'library') {
    setAvatarMenuVisible(false);
    if (Platform.OS === 'ios') {
      setPendingSource(source);
    } else {
      setTimeout(() => pickImage(source), 350);
    }
  }

  function handleSheetDismiss() {
    if (!pendingSource) return;
    const source = pendingSource;
    setPendingSource(null);
    pickImage(source);
  }

  async function pickImage(source: 'camera' | 'library') {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        if (!permission.canAskAgain) {
          Alert.alert(
            source === 'camera' ? 'Camera access needed' : 'Photo library access needed',
            'Enable access in Settings to set a profile picture.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        }
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      updateProfile({ avatarUri: asset.uri });
    } catch (err) {
      Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  function removePhoto() {
    setAvatarMenuVisible(false);
    updateProfile({ avatarUri: undefined });
  }

  return (
    <LinearGradient colors={HomeHeroGradient} style={styles.gradient}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing.two }]}>
        <View style={styles.topRow}>
          <Avatar
            name={profile?.name ?? 'there'}
            imageUri={profile?.avatarUri}
            onPress={() => {
              tap();
              setAvatarMenuVisible(true);
            }}
          />
          <PillSearchInput value={searchValue} onChangeText={onSearchChange} placeholder="Search" />
          <IconActionButton
            icon="stats-chart"
            onPress={onStatsPress}
            backgroundColor={FROSTED_BUTTON_BG}
            tintColor="#ffffff"
          />
          <IconActionButton
            icon="card"
            onPress={onLedgerPress}
            backgroundColor={FROSTED_BUTTON_BG}
            tintColor="#ffffff"
          />
        </View>

        <View style={styles.balanceBlock}>
          <ThemedText type="small" style={styles.balanceLabel}>
            {balanceLabel}
          </ThemedText>
          <ThemedText
            type="title"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            style={styles.balanceValue}>
            {balanceValue}
          </ThemedText>
          <Pressable style={styles.accountsPill} onPress={onAccountsPress}>
            <ThemedText type="smallBold" style={styles.accountsPillText}>
              Accounts
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={avatarMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarMenuVisible(false)}
        onDismiss={handleSheetDismiss}>
        <Pressable
          style={[styles.overlay, { backgroundColor: theme.overlay }]}
          onPress={() => setAvatarMenuVisible(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.sheetTitle}>
              Profile picture
            </ThemedText>
            <AvatarMenuRow icon="camera-outline" label="Take photo" onPress={() => selectSource('camera')} />
            <AvatarMenuRow icon="images-outline" label="Choose from library" onPress={() => selectSource('library')} />
            {profile?.avatarUri ? (
              <AvatarMenuRow icon="trash-outline" label="Remove photo" destructive onPress={removePhoto} />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    width: '100%',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: Spacing.five,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.five,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  balanceBlock: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.75)',
  },
  balanceValue: {
    color: '#ffffff',
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '700',
  },
  accountsPill: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  accountsPillText: {
    color: '#ffffff',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  sheetTitle: {
    marginBottom: Spacing.one,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
});
