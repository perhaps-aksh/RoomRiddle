import React from 'react';
import {StyleSheet, View} from 'react-native';
import type {QrMatrix} from '@roomriddle/shared-types';
import {theme} from '../../theme/theme';

/**
 * Draws a QR code from the server's module matrix (rows of '1'/'0') with
 * plain Views, so the TV needs no QR or SVG library. Each row's dark runs are
 * merged into one View to keep the view count low.
 */
export const QrCode = ({matrix, size, testID}: {matrix: QrMatrix; size: number; testID?: string}) => {
  const quiet = 2; // modules of white margin on each side
  const modules = matrix.length + quiet * 2;
  const cell = size / modules;
  return (
    <View style={[styles.box, {width: size, height: size}]} testID={testID} accessibilityLabel="QR code to join the room">
      {matrix.map((row, y) =>
        runs(row).map(([x, length]) => (
          <View
            key={`${y}-${x}`}
            style={[
              styles.dark,
              {
                left: (x + quiet) * cell,
                top: (y + quiet) * cell,
                width: length * cell + 0.5,
                height: cell + 0.5,
              },
            ]}
          />
        )),
      )}
    </View>
  );
};

/** [start, length] of each run of dark modules in a row. */
export function runs(row: string): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  for (let x = 0; x <= row.length; x++) {
    const dark = row[x] === '1';
    if (dark && start < 0) {
      start = x;
    } else if (!dark && start >= 0) {
      out.push([start, x - start]);
      start = -1;
    }
  }
  return out;
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: theme.colors.qrLight,
    borderRadius: theme.radii.sm,
    overflow: 'hidden',
  },
  dark: {
    position: 'absolute',
    backgroundColor: theme.colors.qrDark,
  },
});
