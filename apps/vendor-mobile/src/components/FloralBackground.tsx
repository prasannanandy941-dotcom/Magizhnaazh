import React from 'react';
import { Image, StyleSheet } from 'react-native';

// The website's FloralGoldBackground, baked to a PNG (see scripts/gen-floral or
// the sharp-rasterised SVG) so the mobile app shows the exact same wine
// gradient, soft glows, rose-bloom corners, sparkles and hearts — without any
// native gradient/blur module.
export function FloralBackground() {
  return (
    <Image
      source={require('../../assets/floral-bg.png')}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
    />
  );
}
