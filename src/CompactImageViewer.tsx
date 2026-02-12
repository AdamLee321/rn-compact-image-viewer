// @ts-nocheck
import React, { useCallback, useMemo } from 'react';
import {
  Image,
  TouchableOpacity,
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
  renderFullscreenButton?: () => React.ReactNode;
  onFullscreenPress?: () => void;
  fullscreenButtonIcon?: React.ReactNode;
  showActionButtonInCompact?: boolean;
  actionButtonIconCompact?: React.ReactNode;
  renderActionButtonCompact?: () => React.ReactNode;
  compactButtonStyle?: StyleProp<ViewStyle>;
  compactButtonsContainerStyle?: StyleProp<ViewStyle>;
};

export default function CompactImageViewer({
  imageSrc,
  visible,
  onRequestClose,
  onLongPress,
  presentationStyle,
  animationType,
  backgroundColor,
  doubleTapToZoomEnabled,
  delayLongPress,
  actionIcon,
  actionButtonStyle,
  onActionPress,

  // Compact-only props
  compactHeight = 250,
  containerStyle,
  imageStyle,
  renderFullscreenButton,
  onFullscreenPress,
  fullscreenButtonIcon,
  showActionButtonInCompact = true,
  compactButtonStyle,
  compactButtonsContainerStyle,
}: CompactImageViewerProps) {
  const normalizedSrc = useMemo(() => {
    return typeof imageSrc === 'string' ? { uri: imageSrc } : imageSrc;
  }, [imageSrc]);

  const handleLongPress = useCallback(() => {
    onLongPress?.(normalizedSrc);
  }, [onLongPress, normalizedSrc]);

  const showCompactAction =
    showActionButtonInCompact &&
    !!actionIcon &&
    typeof onActionPress === 'function';

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

        <View style={[styles.compactButtonsRow, compactButtonsContainerStyle]}>
          {showCompactAction && (
            <TouchableOpacity
              style={[styles.overlayBtn, compactButtonStyle]}
              onPress={onActionPress}
              hitSlop={10}
            >
              {actionIcon}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.overlayBtn, compactButtonStyle]}
            onPress={onFullscreenPress}
            hitSlop={10}
          >
            {renderFullscreenButton
              ? renderFullscreenButton()
              : fullscreenButtonIcon ?? <View style={styles.defaultIconBox} />}
          </TouchableOpacity>
        </View>
      </View>

      <FullScreenImageViewer
        imageSrc={normalizedSrc}
        visible={visible}
        onRequestClose={onRequestClose}
        onLongPress={onLongPress}
        presentationStyle={presentationStyle}
        animationType={animationType}
        backgroundColor={backgroundColor}
        doubleTapToZoomEnabled={doubleTapToZoomEnabled}
        delayLongPress={delayLongPress}
        actionIcon={actionIcon}
        actionButtonStyle={actionButtonStyle}
        onActionPress={onActionPress}
      />
    </>
  );
}

const styles = StyleSheet.create({
  compactContainer: { overflow: 'hidden', width: '100%' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  compactButtonsRow: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayBtn: {
    marginLeft: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  defaultIconBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 2,
  },
});
