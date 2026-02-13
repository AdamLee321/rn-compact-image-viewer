// @ts-nocheck
import React, {
  useCallback,
  useRef,
  useState,
  useMemo,
  useEffect,
} from 'react';

import { Animated, ScrollView, NativeMethodsMixin } from 'react-native';

import useImageDimensions from '../hooks/useImageDimensions';
import usePanResponder from '../hooks/usePanResponder';

import { getImageStyles, getImageTransform } from '../utils';
import { ImageSource, Dimensions } from '../@types';
import ImageLoading from './ImageLoading';

type Props = {
  imageSrc: ImageSource;
  onZoom: (isZoomed: boolean) => void;
  onLongPress: (image: ImageSource) => void;
  delayLongPress: number;
  doubleTapToZoomEnabled?: boolean;
  layout: Dimensions;
};

const ImageItem = ({
  imageSrc,
  onZoom,
  onLongPress,
  delayLongPress,
  doubleTapToZoomEnabled = true,
  layout,
}: Props) => {
  const imageContainer = useRef<ScrollView & NativeMethodsMixin>(null);
  const imageDimensions = useImageDimensions(imageSrc);
  const [translate, scale] = getImageTransform(imageDimensions, layout);
  const [isLoaded, setLoadEnd] = useState(false);

  const onLoaded = useCallback(() => setLoadEnd(true), []);
  const onZoomPerformed = useCallback(
    (isZoomed: boolean) => {
      onZoom(isZoomed);
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
    layout,
  });

  const imageStyles = getImageStyles(
    imageDimensions,
    translateValue,
    scaleValue
  );

  // Reset scroll position when layout changes
  useEffect(() => {
    if (imageContainer.current) {
      imageContainer.current.scrollTo({ x: 0, y: 0, animated: false });
    }
  }, [layout.width, layout.height]);

  const dynamicStyles = useMemo(
    () => ({
      listItem: {
        width: layout.width,
        height: layout.height,
      },
      imageScrollContainer: {
        height: layout.height * 2,
      },
    }),
    [layout.width, layout.height]
  );

  return (
    <ScrollView
      ref={imageContainer}
      style={dynamicStyles.listItem}
      nestedScrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={dynamicStyles.imageScrollContainer}
      scrollEnabled={false}
    >
      <Animated.Image
        {...panHandlers}
        source={imageSrc}
        style={imageStyles}
        onLoad={onLoaded}
      />
      {(!isLoaded || !imageDimensions) && <ImageLoading />}
    </ScrollView>
  );
};

export default React.memo(ImageItem);
