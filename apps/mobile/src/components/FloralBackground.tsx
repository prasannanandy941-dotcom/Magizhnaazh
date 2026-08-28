import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../theme';

const { height } = Dimensions.get('window');

// Brand-flavoured decorative background, built with core RN only (no native
// deps → no rebuild). Soft tinted circles suggest a warm glow; faint florals
// and sparkles scatter around the edges. Everything is very low opacity so the
// white cards and dark text stay perfectly readable on top.
export function FloralBackground() {
  return (
    <View style={styles.fill} pointerEvents="none">
      <View style={[styles.fill, { backgroundColor: colors.bg }]} />

      {/* soft colour glows (no blur in RN, so kept large + very light) */}
      <View style={[styles.blob, { backgroundColor: '#e85d8a', top: -110, left: -80 }]} />
      <View style={[styles.blob, { backgroundColor: '#d4af37', top: height * 0.32, right: -110 }]} />
      <View style={[styles.blob, { backgroundColor: '#b8336a', bottom: -100, left: -70 }]} />
      <View style={[styles.blobSm, { backgroundColor: '#e8b04b', bottom: height * 0.28, right: 30 }]} />

      {/* florals + sparkles */}
      <Deco emoji="🌸" size={70} style={{ top: height * 0.06, left: -14 }} rot="-18deg" />
      <Deco emoji="✨" size={26} style={{ top: height * 0.13, right: 26 }} />
      <Deco emoji="🌸" size={46} style={{ top: height * 0.48, right: -10 }} rot="22deg" />
      <Deco emoji="🤍" size={22} style={{ top: height * 0.4, left: 22 }} />
      <Deco emoji="✨" size={30} style={{ bottom: height * 0.22, left: 34 }} />
      <Deco emoji="🌸" size={58} style={{ bottom: height * 0.05, left: -16 }} rot="14deg" />
      <Deco emoji="✨" size={22} style={{ bottom: height * 0.12, right: 28 }} />
      <Deco emoji="🌼" size={40} style={{ top: height * 0.24, left: 30 }} rot="-10deg" />
    </View>
  );
}

function Deco({ emoji, size, style, rot }: { emoji: string; size: number; style: object; rot?: string }) {
  return (
    <Text style={[styles.deco, style, { fontSize: size, transform: rot ? [{ rotate: rot }] : undefined }]}>
      {emoji}
    </Text>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  blob: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.09 },
  blobSm: { position: 'absolute', width: 180, height: 180, borderRadius: 90, opacity: 0.08 },
  deco: { position: 'absolute', opacity: 0.1 },
});
