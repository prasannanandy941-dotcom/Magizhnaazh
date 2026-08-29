import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// A faithful, core-RN recreation of the website's FloralGoldBackground: deep
// wine gradient wash, soft rose-gold glows, rose-bloom corner ornaments (built
// from shaped views), colour-matched gold star sparkles and rose hearts. No
// native modules → no rebuild.
export function FloralBackground() {
  return (
    <View style={styles.fill} pointerEvents="none">
      {/* deep wine base + a lighter maroon glow toward the top (fakes radial) */}
      <View style={[styles.fill, { backgroundColor: '#12060b' }]} />
      <View style={[styles.glow, { backgroundColor: '#5c1030', top: -H * 0.42, opacity: 0.55 }]} />
      <View style={[styles.glow2, { backgroundColor: '#2a0a1c', top: -H * 0.12, opacity: 0.6 }]} />

      {/* soft rose-gold bokeh glows */}
      <View style={[styles.pool, { backgroundColor: '#d4af37', top: -20, left: W / 2 - 150, opacity: 0.10 }]} />
      <View style={[styles.pool, { backgroundColor: '#e85d8a', bottom: -40, right: -60, opacity: 0.12 }]} />
      <View style={[styles.poolSm, { backgroundColor: '#b8336a', bottom: -20, left: -50, opacity: 0.12 }]} />

      {/* corner rose ornaments */}
      <View style={[styles.corner, { top: -18, left: -18 }]}><Rose /></View>
      <View style={[styles.corner, { top: -18, right: -18, transform: [{ scaleX: -1 }] }]}><Rose /></View>
      <View style={[styles.corner, { bottom: -22, left: -18, transform: [{ scaleY: -1 }] }]}><Rose dim /></View>
      <View style={[styles.corner, { bottom: -22, right: -18, transform: [{ scaleX: -1 }, { scaleY: -1 }] }]}><Rose dim /></View>

      {/* gold star sparkles */}
      {STARS.map((s, i) => (
        <Text key={`s${i}`} style={{ position: 'absolute', top: s.t * H, left: s.l * W, color: s.c, fontSize: s.z, opacity: 0.9 }}>✦</Text>
      ))}
      {/* rose hearts */}
      {HEARTS.map((h, i) => (
        <Text key={`h${i}`} style={{ position: 'absolute', top: h.t * H, left: h.l * W, color: h.c, fontSize: h.z, opacity: h.o }}>♥</Text>
      ))}
      {/* tiny bokeh dots */}
      {DOTS.map((d, i) => (
        <View key={`d${i}`} style={{ position: 'absolute', top: d.t * H, left: d.l * W, width: d.z, height: d.z, borderRadius: d.z / 2, backgroundColor: d.c, opacity: d.o }} />
      ))}
    </View>
  );
}

// A rose bloom on a short vine, built from shaped views (5 petals + gold heart,
// plus two leaves) — mirrors the web SVG motif closely enough at corner scale.
function Rose({ dim }: { dim?: boolean }) {
  const op = dim ? 0.6 : 0.85;
  return (
    <View style={{ width: 150, height: 150, opacity: op }}>
      {/* vine */}
      <View style={styles.vine} />
      {/* leaves */}
      <View style={[styles.leaf, { top: 96, left: 34, backgroundColor: '#8f2352', transform: [{ rotate: '20deg' }] }]} />
      <View style={[styles.leaf, { top: 62, left: 52, backgroundColor: '#b8336a', transform: [{ rotate: '-15deg' }] }]} />
      {/* bloom at the vine tip */}
      <View style={{ position: 'absolute', top: 30, left: 78 }}>
        {[0, 72, 144, 216, 288].map((a) => (
          <View
            key={a}
            style={[styles.petal, { transform: [{ rotate: `${a}deg` }, { translateY: -13 }] }]}
          />
        ))}
        <View style={styles.bloomCenter} />
      </View>
      {/* small secondary gold flower mid-vine */}
      <View style={{ position: 'absolute', top: 92, left: 40 }}>
        {[0, 90, 180, 270].map((a) => (
          <View key={a} style={[styles.petalSm, { transform: [{ rotate: `${a}deg` }, { translateY: -8 }] }]} />
        ))}
        <View style={styles.bloomCenterSm} />
      </View>
    </View>
  );
}

const STARS = [
  { t: 0.14, l: 0.30, z: 13, c: '#f0c869' }, { t: 0.26, l: 0.75, z: 11, c: '#e85d8a' },
  { t: 0.50, l: 0.10, z: 12, c: '#f0c869' }, { t: 0.62, l: 0.90, z: 14, c: '#f2a6c4' },
  { t: 0.76, l: 0.35, z: 11, c: '#f0c869' }, { t: 0.08, l: 0.58, z: 12, c: '#e85d8a' },
  { t: 0.40, l: 0.48, z: 10, c: '#f0c869' }, { t: 0.90, l: 0.65, z: 13, c: '#f2a6c4' },
];
const HEARTS = [
  { t: 0.16, l: 0.18, z: 15, c: '#f2a6c4', o: 0.5 }, { t: 0.64, l: 0.84, z: 19, c: '#e85d8a', o: 0.45 },
  { t: 0.46, l: 0.06, z: 13, c: '#f0c869', o: 0.45 }, { t: 0.30, l: 0.70, z: 12, c: '#f2a6c4', o: 0.5 },
  { t: 0.82, l: 0.28, z: 14, c: '#e85d8a', o: 0.45 }, { t: 0.08, l: 0.45, z: 12, c: '#f2a6c4', o: 0.5 },
];
const DOTS = [
  { t: 0.12, l: 0.08, z: 6, c: '#f0c869', o: 0.5 }, { t: 0.22, l: 0.88, z: 5, c: '#e85d8a', o: 0.45 },
  { t: 0.38, l: 0.15, z: 5, c: '#f0c869', o: 0.45 }, { t: 0.55, l: 0.92, z: 6, c: '#f0c869', o: 0.4 },
  { t: 0.68, l: 0.06, z: 5, c: '#e85d8a', o: 0.4 }, { t: 0.80, l: 0.78, z: 5, c: '#f0c869', o: 0.5 },
  { t: 0.30, l: 0.35, z: 5, c: '#f0c869', o: 0.4 }, { t: 0.72, l: 0.52, z: 5, c: '#e85d8a', o: 0.4 },
];

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  glow: { position: 'absolute', alignSelf: 'center', width: W * 1.8, height: W * 1.8, borderRadius: W * 0.9 },
  glow2: { position: 'absolute', alignSelf: 'center', width: W * 1.4, height: W * 1.4, borderRadius: W * 0.7 },
  pool: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  poolSm: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  corner: { position: 'absolute' },
  vine: {
    position: 'absolute', top: 30, left: 60, width: 2, height: 100, backgroundColor: '#c9a648',
    opacity: 0.7, borderRadius: 1, transform: [{ rotate: '18deg' }],
  },
  leaf: { position: 'absolute', width: 16, height: 10, borderRadius: 8 },
  petal: {
    position: 'absolute', width: 12, height: 22, borderRadius: 11, marginLeft: -6, marginTop: -11,
    backgroundColor: '#e85d8a',
  },
  bloomCenter: {
    position: 'absolute', width: 12, height: 12, borderRadius: 6, marginLeft: -6, marginTop: -6,
    backgroundColor: '#d4af37',
  },
  petalSm: {
    position: 'absolute', width: 8, height: 14, borderRadius: 7, marginLeft: -4, marginTop: -7,
    backgroundColor: '#d4af37', opacity: 0.85,
  },
  bloomCenterSm: {
    position: 'absolute', width: 8, height: 8, borderRadius: 4, marginLeft: -4, marginTop: -4,
    backgroundColor: '#c9a648',
  },
});
