// @ts-nocheck
import React, { useCallback, useMemo } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ImageStyle,
  type ViewStyle,
} from 'react-native';

import FullScreenImageViewer, {
  type Props as FullScreenImageViewerProps,
} from './FullScreenImageViewer';

export type CompactImageViewerProps = FullScreenImageViewerProps & {
  compactHeight?: number;
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  fullscreenButtonStyle?: StyleProp<ViewStyle>;
  renderFullscreenButton?: () => React.ReactNode;
  onFullscreenPress?: () => void;
};

export default function CompactImageViewer({
  imageSrc,
  visible,
  onRequestClose,
  onLongPress,
  presentationStyle,
  animationType,
  backgroundColor,
  swipeToCloseEnabled,
  doubleTapToZoomEnabled,
  delayLongPress,
  swipeCloseSensitivity,

  // Compact-only props
  compactHeight = 200,
  containerStyle,
  imageStyle,
  fullscreenButtonStyle,
  renderFullscreenButton,
  onFullscreenPress,
}: CompactImageViewerProps) {
  const normalizedSrc = useMemo(() => {
    return typeof imageSrc === 'string' ? { uri: imageSrc } : imageSrc;
  }, [imageSrc]);

  const handleLongPress = useCallback(() => {
    onLongPress?.(normalizedSrc);
  }, [onLongPress, normalizedSrc]);

  return (
    <>
      <View
        style={[
          styles.compactContainer,
          { height: compactHeight },
          containerStyle,
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onLongPress={onLongPress ? handleLongPress : undefined}
          delayLongPress={delayLongPress}
        >
          <Image source={normalizedSrc} style={[styles.image, imageStyle]} />
        </Pressable>

        <Pressable
          style={[styles.fullscreenBtn, fullscreenButtonStyle]}
          onPress={onFullscreenPress}
          hitSlop={10}
        >
          {renderFullscreenButton ? (
            renderFullscreenButton()
          ) : (
            <View style={styles.defaultIconBox} />
          )}
        </Pressable>
      </View>

      <FullScreenImageViewer
        imageSrc={normalizedSrc}
        visible={visible}
        onRequestClose={onRequestClose}
        onLongPress={onLongPress}
        presentationStyle={presentationStyle}
        animationType={animationType}
        backgroundColor={backgroundColor}
        swipeToCloseEnabled={swipeToCloseEnabled}
        doubleTapToZoomEnabled={doubleTapToZoomEnabled}
        delayLongPress={delayLongPress}
        swipeCloseSensitivity={swipeCloseSensitivity}
      />
    </>
  );
}

const styles = StyleSheet.create({
  compactContainer: {
    overflow: 'hidden',
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  fullscreenBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
  },
  defaultIconBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 2,
  },
});
