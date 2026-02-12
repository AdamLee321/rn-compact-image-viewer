// @ts-nocheck
import React, { useCallback, useRef, useState } from 'react';

import {
  Animated,
  ScrollView,
  Dimensions,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type NativeMethodsMixin,
} from 'react-native';

import useImageDimensions from './hooks/useImageDimensions';
import usePanResponder from './hooks/usePanResponder';

import { getImageStyles, getImageTransform } from './utils';
import type { ImageSource } from './types';
import { ImageLoading } from './ImageLoading';

const SWIPE_CLOSE_OFFSET = 75;
const SWIPE_CLOSE_VELOCITY = 1.75;
const SCREEN = Dimensions.get('window');
const SCREEN_WIDTH = SCREEN.width;
const SCREEN_HEIGHT = SCREEN.height;

type Props = {
  imageSrc: ImageSource;
  onRequestClose: () => void;
  onZoom: (isZoomed: boolean) => void;
  onLongPress: (image: ImageSource) => void;
  delayLongPress: number;
  swipeToCloseEnabled?: boolean;
  doubleTapToZoomEnabled?: boolean;
  swipeCloseSensitivity?: number; // 1 (hard) .. 10 (easy)
};

export const ImageItem = ({
  imageSrc,
  onZoom,
  onRequestClose,
  onLongPress,
  delayLongPress,
  swipeToCloseEnabled = true,
  doubleTapToZoomEnabled = true,
  swipeCloseSensitivity,
}: Props) => {
  const imageContainer = useRef<ScrollView & NativeMethodsMixin>(null);
  const imageDimensions = useImageDimensions(imageSrc);
  const [translate, scale] = getImageTransform(imageDimensions, SCREEN);
  const scrollValueY = new Animated.Value(0);
  const [isLoaded, setLoadEnd] = useState(false);

  const onLoaded = useCallback(() => setLoadEnd(true), []);
  const onZoomPerformed = useCallback(
    (isZoomed: boolean) => {
      onZoom(isZoomed);
      if (imageContainer?.current) {
        imageContainer.current.setNativeProps({
          scrollEnabled: !isZoomed,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [imageContainer]
  );

  const onLongPressHandler = useCallback(() => {
    onLongPress(imageSrc);
  }, [imageSrc, onLongPress]);

  const [panHandlers, scaleValue, translateValue] = usePanResponder({
    initialScale: scale || 1,
    initialTranslate: translate || { x: 0, y: 0 },
    onZoom: onZoomPerformed,
    doubleTapToZoomEnabled,
    onLongPress: onLongPressHandler,
    delayLongPress,
  });

  const imagesStyles = getImageStyles(
    imageDimensions,
    translateValue,
    scaleValue
  );
  const imageOpacity = scrollValueY.interpolate({
    inputRange: [-SWIPE_CLOSE_OFFSET, 0, SWIPE_CLOSE_OFFSET],
    outputRange: [0.7, 1, 0.7],
  });
  const imageStylesWithOpacity = { ...imagesStyles, opacity: imageOpacity };

  const onScrollEndDrag = ({
    nativeEvent,
  }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const velocityY = nativeEvent?.velocity?.y ?? 0;
    const offsetY = nativeEvent?.contentOffset?.y ?? 0;

    // Map sensitivity (1..10) to velocity threshold [low..high].
    // Higher sensitivity => lower required velocity to close.
    const s = swipeCloseSensitivity;
    const velocityThreshold =
      s == null
        ? SWIPE_CLOSE_VELOCITY
        : (() => {
            const clamped = Math.max(1, Math.min(10, s));
            const minV = 0.4; // easiest
            const maxV = 2.5; // hardest
            return maxV - ((clamped - 1) / 9) * (maxV - minV);
          })();

    const shouldClose =
      (Math.abs(velocityY) > velocityThreshold &&
        offsetY > SWIPE_CLOSE_OFFSET) ||
      offsetY > SCREEN_HEIGHT / 2;

    if (shouldClose) {
      onRequestClose();
      return;
    }

    // Not closing -> reset scroll position so image opacity returns to 1
    if (imageContainer?.current) {
      imageContainer.current.scrollTo({ y: 0, animated: true });
    }
    scrollValueY.setValue(0);
  };

  const onScroll = ({
    nativeEvent,
  }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = nativeEvent?.contentOffset?.y ?? 0;

    scrollValueY.setValue(offsetY);
  };

  return (
    <ScrollView
      ref={imageContainer}
      style={styles.listItem}
      pagingEnabled
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.imageScrollContainer}
      scrollEnabled={swipeToCloseEnabled}
      {...(swipeToCloseEnabled && {
        onScroll,
        onScrollEndDrag,
      })}
    >
      <Animated.Image
        {...panHandlers}
        source={imageSrc}
        style={imageStylesWithOpacity}
        onLoad={onLoaded}
      />
      {(!isLoaded || !imageDimensions) && <ImageLoading />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  listItem: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  imageScrollContainer: {
    height: SCREEN_HEIGHT * 2,
  },
});

export default React.memo(ImageItem);
