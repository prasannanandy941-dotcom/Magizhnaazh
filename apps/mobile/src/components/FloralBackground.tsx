import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface ParticleSpec {
  leftPct: number;
  startTopPct: number;
  size: number;
  duration: number;
  delay: number;
  kind: 'flower' | 'bokeh' | 'sparkle';
}

const PARTICLES: ParticleSpec[] = [
  // Micro-delicate Rising Magizham-Poo Blossoms (10px–14px)
  { leftPct: 0.06, startTopPct: 0.82, size: 12, duration: 8200, delay: 0,    kind: 'flower' },
  { leftPct: 0.16, startTopPct: 0.74, size: 11, duration: 7600, delay: 1200, kind: 'flower' },
  { leftPct: 0.28, startTopPct: 0.86, size: 13, duration: 8800, delay: 600,  kind: 'flower' },
  { leftPct: 0.41, startTopPct: 0.78, size: 10, duration: 7900, delay: 1800, kind: 'flower' },
  { leftPct: 0.54, startTopPct: 0.84, size: 12, duration: 8500, delay: 400,  kind: 'flower' },
  { leftPct: 0.67, startTopPct: 0.72, size: 11, duration: 8100, delay: 1500, kind: 'flower' },
  { leftPct: 0.79, startTopPct: 0.85, size: 13, duration: 8700, delay: 900,  kind: 'flower' },
  { leftPct: 0.90, startTopPct: 0.76, size: 11, duration: 7800, delay: 2100, kind: 'flower' },

  // Luminous Rising 24K Gold Bokeh Orbs (5px–11px)
  { leftPct: 0.10, startTopPct: 0.88, size: 8,  duration: 6800, delay: 300,  kind: 'bokeh' },
  { leftPct: 0.22, startTopPct: 0.66, size: 10, duration: 7200, delay: 1100, kind: 'bokeh' },
  { leftPct: 0.34, startTopPct: 0.85, size: 7,  duration: 6400, delay: 1900, kind: 'bokeh' },
  { leftPct: 0.48, startTopPct: 0.79, size: 11, duration: 7500, delay: 700,  kind: 'bokeh' },
  { leftPct: 0.61, startTopPct: 0.89, size: 8,  duration: 6700, delay: 1400, kind: 'bokeh' },
  { leftPct: 0.73, startTopPct: 0.68, size: 10, duration: 7300, delay: 500,  kind: 'bokeh' },
  { leftPct: 0.84, startTopPct: 0.87, size: 7,  duration: 6500, delay: 1700, kind: 'bokeh' },
  { leftPct: 0.94, startTopPct: 0.64, size: 9,  duration: 7000, delay: 1000, kind: 'bokeh' },

  // Tiny 4-Point Diamond Gold Sparkles
  { leftPct: 0.19, startTopPct: 0.52, size: 9,  duration: 6300, delay: 800,  kind: 'sparkle' },
  { leftPct: 0.52, startTopPct: 0.46, size: 8,  duration: 6100, delay: 1600, kind: 'sparkle' },
  { leftPct: 0.82, startTopPct: 0.50, size: 9,  duration: 6400, delay: 400,  kind: 'sparkle' },
];

function RisingParticle({ spec }: { spec: ParticleSpec }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(spec.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: spec.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress, spec.delay, spec.duration]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -175],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 11, -8],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.18, 0.82, 1],
    outputRange: [0, 0.92, 0.85, 0],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '200deg'],
  });

  const left = spec.leftPct * SCREEN_W;
  const top = spec.startTopPct * SCREEN_H;

  if (spec.kind === 'bokeh') {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bokehOrb,
          {
            left,
            top,
            width: spec.size,
            height: spec.size,
            borderRadius: spec.size / 2,
            opacity,
            transform: [{ translateY }, { translateX }],
          },
        ]}
      />
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    >
      {spec.kind === 'flower' ? (
        <View
          style={[
            styles.magizhamBlossom,
            { width: spec.size, height: spec.size, borderRadius: spec.size / 2 },
          ]}
        >
          <View style={styles.magizhamCore} />
        </View>
      ) : (
        <Text style={[styles.goldSparkle, { fontSize: spec.size }]}>✦</Text>
      )}
    </Animated.View>
  );
}

export function RisingMagizhamOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PARTICLES.map((p, idx) => (
        <RisingParticle key={idx} spec={p} />
      ))}
    </View>
  );
}

export function FloralBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Soft Peach-Blush & Silk-Ivory Light Backdrop */}
      <View style={styles.baseCanvas} />
      <View style={styles.centerCreamGlow} />
      <RisingMagizhamOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8E4E2',
    overflow: 'hidden',
  },
  baseCanvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F6E3DE',
  },
  centerCreamGlow: {
    position: 'absolute',
    top: '12%',
    left: '8%',
    right: '8%',
    height: '55%',
    borderRadius: 240,
    backgroundColor: '#FFF7F2',
    opacity: 0.78,
  },
  bokehOrb: {
    position: 'absolute',
    backgroundColor: '#FFE47A',
    borderWidth: 1,
    borderColor: '#FFFDF0',
    shadowColor: '#F5B727',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 6,
    elevation: 4,
  },
  magizhamBlossom: {
    backgroundColor: '#FFFDF7',
    borderWidth: 1.2,
    borderColor: '#D9A326',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E5B84B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 4,
    elevation: 3,
  },
  magizhamCore: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D97706',
    borderWidth: 0.6,
    borderColor: '#7A1432',
  },
  goldSparkle: {
    color: '#D49B27',
    fontWeight: '900',
    textShadowColor: '#FFF7BD',
    textShadowRadius: 4,
  },
});
