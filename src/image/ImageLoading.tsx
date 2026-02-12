// @ts-nocheck
import React from 'react';

import { ActivityIndicator, StyleSheet, View, ViewProps } from 'react-native';

const ImageLoading: React.FC<ViewProps> = ({ style }) => (
  <View style={[style, styles.loading]}>
    <ActivityIndicator size="small" color="#FFF" />
  </View>
);

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(ImageLoading);
