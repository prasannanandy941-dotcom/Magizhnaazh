import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Recreates the website's dark wine + gold floral backdrop with core RN only
// (no native gradient module → no rebuild). A dark base with a lighter maroon
// "glow" toward the top approximates the web's radial gradient; soft colour
// pools + faint maroon florals, gold sparkles and hearts complete the look.
export function FloralBackground() {
  return (
    <View style={styles.fill} pointerEvents="none">
      {/* darkest base */}
      <View style={[styles.fill, { backgroundColor: '#12060b' }]} />
      {/* lighter maroon glow toward the top-centre (fakes the radial gradient) */}
      <View style={[styles.glow, { backgroundColor: '#5c1030', top: -height * 0.45, opacity: 0.55 }]} />
      <View style={[styles.glow2, { backgroundColor: '#2a0a1c', top: -height * 0.15, opacity: 0.6 }]} />

      {/* soft colour pools (gold / rose / wine) */}
      <View style={[styles.pool, { backgroundColor: '#d4af37', top: height * 0.28, right: -110, opacity: 0.10 }]} />
      <View style={[styles.pool, { backgroundColor: '#e85d8a', bottom: -60, right: 10, opacity: 0.12 }]} />
      <View style={[styles.pool, { backgroundColor: '#b8336a', bottom: -40, left: -70, opacity: 0.12 }]} />

      {/* florals, sparkles, hearts (emoji, dim so they read as decoration) */}
      <Deco emoji="🌸" size={72} style={{ top: -10, left: -18 }} rot="-18deg" op={0.5} />
      <Deco emoji="🌸" size={40} style={{ top: height * 0.02, left: 40 }} rot="30deg" op={0.4} />
      <Deco emoji="✨" size={22} style={{ top: height * 0.12, left: width * 0.2 }} op={0.85} />
      <Deco emoji="✦" size={20} style={{ top: height * 0.14, right: 30 }} op={0.8} />
      <Deco emoji="🤍" size={20} style={{ top: height * 0.16, right: width * 0.45 }} op={0.5} />
      <Deco emoji="✨" size={16} style={{ top: height * 0.4, left: 30 }} op={0.7} />
      <Deco emoji="✦" size={22} style={{ top: height * 0.5, right: 40 }} op={0.75} />
      <Deco emoji="🤍" size={16} style={{ top: height * 0.46, left: width * 0.3 }} op={0.45} />
      <Deco emoji="✨" size={18} style={{ bottom: height * 0.2, left: width * 0.25 }} op={0.7} />
      <Deco emoji="🌸" size={60} style={{ bottom: -14, left: -20 }} rot="12deg" op={0.5} />
      <Deco emoji="🌸" size={34} style={{ bottom: height * 0.02, left: 44 }} rot="-24deg" op={0.4} />
      <Deco emoji="🤍" size={18} style={{ bottom: height * 0.14, right: 40 }} op={0.5} />
      <Deco emoji="✦" size={16} style={{ bottom: height * 0.1, right: width * 0.35 }} op={0.7} />
    </View>
  );
}

function Deco({ emoji, size, style, rot, op }: { emoji: string; size: number; style: object; rot?: string; op: number }) {
  return (
    <Text style={[styles.deco, style, { fontSize: size, opacity: op, transform: rot ? [{ rotate: rot }] : undefined }]}>
      {emoji}
    </Text>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  glow: {
    position: 'absolute', alignSelf: 'center',
    width: width * 1.8, height: width * 1.8, borderRadius: width * 0.9,
  },
  glow2: {
    position: 'absolute', alignSelf: 'center',
    width: width * 1.4, height: width * 1.4, borderRadius: width * 0.7,
  },
  pool: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  deco: { position: 'absolute' },
});
