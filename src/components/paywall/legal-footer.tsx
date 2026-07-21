import { Linking, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';

// Apple requires the app itself (not just App Store Connect metadata) to link to
// both documents from the purchase flow (Guideline 3.1.2). No custom EULA is
// published, so Terms of Use points at Apple's standard EULA per their guidance.
const PRIVACY_POLICY_URL = 'https://brooksryan050-hue.github.io/BudgetCuh/privacy.html';
const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

function openLink(url: string) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  Linking.openURL(url).catch(() => {});
}

export function PaywallLegalFooter() {
  return (
    <View style={styles.row}>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.link}
        onPress={() => openLink(TERMS_OF_USE_URL)}>
        Terms of Use
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {'  ·  '}
      </ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.link}
        onPress={() => openLink(PRIVACY_POLICY_URL)}>
        Privacy Policy
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  link: {
    textDecorationLine: 'underline',
  },
});
