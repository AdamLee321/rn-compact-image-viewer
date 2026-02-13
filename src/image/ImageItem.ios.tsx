// @ts-nocheck
import React, { useCallback, useRef, useState } from 'react';

import {
  Animated,
  ScrollView,
  View,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableWithoutFeedback,
} from 'react-native';

import useDoubleTapToZoom from '../hooks/useDoubleTapToZoom';
import useImageDimensions from '../hooks/useImageDimensions';

import { getImageStyles, getImageTransform } from '../utils';
import { ImageSource, Dimensions } from './@types';
import ImageLoading from './ImageLoading';

type Props = {
  imageSrc: ImageSource;
  onZoom: (scaled: boolean) => void;
  doubleTapToZoomEnabled?: boolean;
  layout: Dimensions;
};

const ImageItem = ({
  imageSrc,
  onZoom,
  doubleTapToZoomEnabled = true,
  layout,
}: Props) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [loaded, setLoaded] = useState(false);
  const [scaled, setScaled] = useState(false);
  const imageDimensions = useImageDimensions(imageSrc);
  const handleDoubleTap = useDoubleTapToZoom(scrollViewRef, scaled, layout);

  const [translate, scale] = getImageTransform(imageDimensions, layout);
  const scaleValue = new Animated.Value(scale || 1);
  const translateValue = new Animated.ValueXY(translate);
  const maxScale = scale && scale > 0 ? Math.max(1 / scale, 1) : 1;

  const imageStyles = getImageStyles(
    imageDimensions,
    translateValue,
    scaleValue
  );

  const onScrollEndDrag = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const scaled = nativeEvent?.zoomScale > 1;

      onZoom(scaled);
      setScaled(scaled);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scaled]
  );

  const layoutStyle = React.useMemo(
    () => ({
      width: layout.width,
      height: layout.height,
    }),
    [layout]
  );

  return (
    <View>
      <ScrollView
        ref={scrollViewRef}
        style={layoutStyle}
        pinchGestureEnabled
        scrollEnabled={false}
        nestedScrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        maximumZoomScale={maxScale}
        contentContainerStyle={{
          height: layout.height * 2,
        }}
        onScrollEndDrag={onScrollEndDrag}
        scrollEventThrottle={1}
      >
        {(!loaded || !imageDimensions) && <ImageLoading style={layoutStyle} />}
        <TouchableWithoutFeedback
          onPress={doubleTapToZoomEnabled ? handleDoubleTap : undefined}
        >
          <Animated.Image
            source={imageSrc}
            style={imageStyles}
            onLoad={() => setLoaded(true)}
          />
        </TouchableWithoutFeedback>
      </ScrollView>
    </View>
  );
};

export default React.memo(ImageItem);
