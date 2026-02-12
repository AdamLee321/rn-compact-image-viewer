// @ts-nocheck
import { useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Animated,
  GestureResponderEvent,
  GestureResponderHandlers,
  NativeTouchEvent,
  PanResponder,
  PanResponderGestureState,
} from 'react-native';

import { Position, Dimensions } from '../@types';
import {
  getDistanceBetweenTouches,
  getImageTranslate,
  getImageDimensionsByTranslate,
} from '../utils';

const SCALE_MAX = 2;
const DOUBLE_TAP_DELAY = 300;
const OUT_BOUND_MULTIPLIER = 0.75;

type Props = {
  initialScale: number;
  initialTranslate: Position;
  onZoom: (isZoomed: boolean) => void;
  doubleTapToZoomEnabled: boolean;
  onLongPress: () => void;
  delayLongPress: number;
  layout: Dimensions;
};

type TouchPoint = { pageX: number; pageY: number };

const copyTwoTouches = (touches: NativeTouchEvent[]): TouchPoint[] => {
  const a = touches?.[0];
  const b = touches?.[1];
  if (!a || !b) return [];
  return [
    { pageX: a.pageX, pageY: a.pageY },
    { pageX: b.pageX, pageY: b.pageY },
  ];
};

const usePanResponder = ({
  initialScale,
  initialTranslate,
  onZoom,
  doubleTapToZoomEnabled,
  onLongPress,
  delayLongPress,
  layout,
}: Props): Readonly<
  [GestureResponderHandlers, Animated.Value, Animated.ValueXY]
> => {
  const MIN_DIMENSION = Math.min(layout.width, layout.height);
  const meaningfulShift = MIN_DIMENSION * 0.01;

  // Persist Animated values (avoid recreating each render)
  const scaleValueRef = useRef<Animated.Value>(
    new Animated.Value(initialScale)
  );
  const translateValueRef = useRef<Animated.ValueXY>(
    new Animated.ValueXY(initialTranslate)
  );

  // Persist mutable gesture state
  const s = useRef({
    currentScale: initialScale,
    currentTranslate: initialTranslate as Position,

    tmpScale: 0,
    tmpTranslate: null as Position | null,

    // tap / long press
    isDoubleTapPerformed: false,
    lastTapTS: null as number | null,
    longPressTimeout: null as any,

    // pinch tracking
    pinchActive: false,
    pinchStartScale: initialScale,
    pinchStartTranslate: initialTranslate as Position,
    pinchStartTouches: [] as TouchPoint[],
  });

  // Recompute based on current initialTranslate/layout (same as your code)
  const imageDimensions = useMemo(
    () => getImageDimensionsByTranslate(initialTranslate, layout),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialTranslate.x, initialTranslate.y, layout.width, layout.height]
  );

  const getBounds = useCallback(
    (scale: number) => {
      const scaledImageDimensions = {
        width: imageDimensions.width * scale,
        height: imageDimensions.height * scale,
      };
      const translateDelta = getImageTranslate(scaledImageDimensions, layout);

      const left = initialTranslate.x - translateDelta.x;
      const right = left - (scaledImageDimensions.width - layout.width);
      const top = initialTranslate.y - translateDelta.y;
      const bottom = top - (scaledImageDimensions.height - layout.height);

      return [top, left, bottom, right] as const;
    },
    [
      imageDimensions.height,
      imageDimensions.width,
      initialTranslate.x,
      initialTranslate.y,
      layout,
    ]
  );

  const getTranslateInBounds = useCallback(
    (translate: Position, scale: number) => {
      const inBoundTranslate = { x: translate.x, y: translate.y };
      const [topBound, leftBound, bottomBound, rightBound] = getBounds(scale);

      if (translate.x > leftBound) inBoundTranslate.x = leftBound;
      else if (translate.x < rightBound) inBoundTranslate.x = rightBound;

      if (translate.y > topBound) inBoundTranslate.y = topBound;
      else if (translate.y < bottomBound) inBoundTranslate.y = bottomBound;

      return inBoundTranslate;
    },
    [getBounds]
  );

  const fitsScreenByWidth = useCallback(
    () => imageDimensions.width * s.current.currentScale < layout.width,
    [imageDimensions.width, layout.width]
  );

  const fitsScreenByHeight = useCallback(
    () => imageDimensions.height * s.current.currentScale < layout.height,
    [imageDimensions.height, layout.height]
  );

  const cancelLongPress = useCallback(() => {
    if (s.current.longPressTimeout) {
      clearTimeout(s.current.longPressTimeout);
      s.current.longPressTimeout = null;
    }
  }, []);

  // Keep onZoom listener stable and not duplicated
  useEffect(() => {
    const id = scaleValueRef.current.addListener(({ value }) => {
      if (typeof onZoom === 'function') onZoom(value !== initialScale);
    });

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      scaleValueRef.current.removeListener(id);
    };
  }, [onZoom, initialScale]);

  // If caller changes the initial transform (rotation/layout/image change), reset state
  useEffect(() => {
    scaleValueRef.current.setValue(initialScale);
    translateValueRef.current.setValue(initialTranslate);

    s.current.currentScale = initialScale;
    s.current.currentTranslate = initialTranslate;
    s.current.tmpScale = 0;
    s.current.tmpTranslate = null;
    s.current.pinchActive = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialScale,
    initialTranslate.x,
    initialTranslate.y,
    layout.width,
    layout.height,
  ]);

  const panResponder = useMemo(() => {
    const scaleValue = scaleValueRef.current;
    const translateValue = translateValueRef.current;

    return PanResponder.create({
      // Ensure Android grants responder for multi-touch (pinch)
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: (evt) =>
        (evt.nativeEvent.touches?.length ?? 0) > 1,
      onMoveShouldSetPanResponderCapture: (evt) =>
        (evt.nativeEvent.touches?.length ?? 0) > 1,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const touchesCount = evt.nativeEvent.touches?.length ?? 0;

        s.current.pinchActive = false;
        s.current.isDoubleTapPerformed = false;

        if (touchesCount === 1) {
          s.current.longPressTimeout = setTimeout(onLongPress, delayLongPress);
        } else {
          cancelLongPress();
        }
      },

      onPanResponderStart: (evt: GestureResponderEvent) => {
        const touchesCount = evt.nativeEvent.touches?.length ?? 0;
        if (touchesCount !== 1) return;

        const tapTS = Date.now();
        s.current.isDoubleTapPerformed = Boolean(
          s.current.lastTapTS && tapTS - s.current.lastTapTS < DOUBLE_TAP_DELAY
        );

        if (doubleTapToZoomEnabled && s.current.isDoubleTapPerformed) {
          cancelLongPress();

          const isScaled = s.current.currentScale !== initialScale;
          const { pageX: touchX, pageY: touchY } = evt.nativeEvent.touches[0];

          const targetScale = 1.5;
          const nextScale = isScaled ? initialScale : targetScale;

          const nextTranslate = isScaled
            ? initialTranslate
            : getTranslateInBounds(
                {
                  x:
                    initialTranslate.x +
                    (layout.width / 2 - touchX) *
                      (targetScale / s.current.currentScale),
                  y:
                    initialTranslate.y +
                    (layout.height / 2 - touchY) *
                      (targetScale / s.current.currentScale),
                },
                targetScale
              );

          Animated.parallel(
            [
              Animated.timing(translateValue.x, {
                toValue: nextTranslate.x,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(translateValue.y, {
                toValue: nextTranslate.y,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(scaleValue, {
                toValue: nextScale,
                duration: 300,
                useNativeDriver: true,
              }),
            ],
            { stopTogether: false }
          ).start(() => {
            s.current.currentScale = nextScale;
            s.current.currentTranslate = nextTranslate;
          });

          s.current.lastTapTS = null;
        } else {
          s.current.lastTapTS = tapTS;
        }
      },

      onPanResponderMove: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const touchesCount = evt.nativeEvent.touches?.length ?? 0;

        const { dx, dy } = gestureState;
        if (
          Math.abs(dx) >= meaningfulShift ||
          Math.abs(dy) >= meaningfulShift
        ) {
          cancelLongPress();
        }

        if (doubleTapToZoomEnabled && s.current.isDoubleTapPerformed) {
          cancelLongPress();
          return;
        }

        // Pinch
        if (touchesCount === 2) {
          cancelLongPress();

          if (!s.current.pinchActive) {
            s.current.pinchActive = true;
            s.current.pinchStartScale = s.current.currentScale;
            s.current.pinchStartTranslate = s.current.currentTranslate;
            s.current.pinchStartTouches = copyTwoTouches(
              evt.nativeEvent.touches
            );
          }

          const initialDistance = getDistanceBetweenTouches(
            s.current.pinchStartTouches as any
          );
          const currentDistance = getDistanceBetweenTouches(
            copyTwoTouches(evt.nativeEvent.touches) as any
          );

          if (!initialDistance || !currentDistance) return;

          let nextScale =
            (currentDistance / initialDistance) * s.current.pinchStartScale;

          // resistance when underscaling
          if (nextScale < initialScale) {
            nextScale =
              nextScale + (initialScale - nextScale) * OUT_BOUND_MULTIPLIER;
          }

          // resistance when overscaling
          if (nextScale > SCALE_MAX) {
            nextScale =
              SCALE_MAX + (nextScale - SCALE_MAX) * (1 - OUT_BOUND_MULTIPLIER);
          }

          // If scaling down, ease translate back toward initialTranslate (your original behavior)
          if (
            s.current.pinchStartScale > initialScale &&
            s.current.pinchStartScale > nextScale
          ) {
            const denom = s.current.pinchStartScale - nextScale;
            const numer = s.current.pinchStartScale - initialScale;

            if (denom !== 0) {
              const k = numer / denom;

              const nextTranslateX =
                nextScale < initialScale
                  ? initialTranslate.x
                  : s.current.pinchStartTranslate.x -
                    (s.current.pinchStartTranslate.x - initialTranslate.x) / k;

              const nextTranslateY =
                nextScale < initialScale
                  ? initialTranslate.y
                  : s.current.pinchStartTranslate.y -
                    (s.current.pinchStartTranslate.y - initialTranslate.y) / k;

              translateValue.x.setValue(nextTranslateX);
              translateValue.y.setValue(nextTranslateY);
              s.current.tmpTranslate = { x: nextTranslateX, y: nextTranslateY };
            }
          }

          scaleValue.setValue(nextScale);
          s.current.tmpScale = nextScale;
          return;
        }

        // Pan (only when zoomed)
        if (touchesCount === 1 && s.current.currentScale > initialScale) {
          cancelLongPress();

          const { x, y } = s.current.currentTranslate;
          const [topBound, leftBound, bottomBound, rightBound] = getBounds(
            s.current.currentScale
          );

          let nextTranslateX = x + dx;
          let nextTranslateY = y + dy;

          if (nextTranslateX > leftBound) {
            nextTranslateX =
              nextTranslateX -
              (nextTranslateX - leftBound) * OUT_BOUND_MULTIPLIER;
          }
          if (nextTranslateX < rightBound) {
            nextTranslateX =
              nextTranslateX -
              (nextTranslateX - rightBound) * OUT_BOUND_MULTIPLIER;
          }

          if (nextTranslateY > topBound) {
            nextTranslateY =
              nextTranslateY -
              (nextTranslateY - topBound) * OUT_BOUND_MULTIPLIER;
          }
          if (nextTranslateY < bottomBound) {
            nextTranslateY =
              nextTranslateY -
              (nextTranslateY - bottomBound) * OUT_BOUND_MULTIPLIER;
          }

          if (fitsScreenByWidth()) nextTranslateX = x;
          if (fitsScreenByHeight()) nextTranslateY = y;

          translateValue.x.setValue(nextTranslateX);
          translateValue.y.setValue(nextTranslateY);

          s.current.tmpTranslate = { x: nextTranslateX, y: nextTranslateY };
        }
      },

      onPanResponderRelease: () => {
        cancelLongPress();
        s.current.isDoubleTapPerformed = false;
        s.current.pinchActive = false;

        // finalize scale
        if (s.current.tmpScale > 0) {
          let finalScale = s.current.tmpScale;
          if (finalScale < initialScale) finalScale = initialScale;
          if (finalScale > SCALE_MAX) finalScale = SCALE_MAX;

          if (finalScale !== s.current.tmpScale) {
            Animated.timing(scaleValue, {
              toValue: finalScale,
              duration: 120,
              useNativeDriver: true,
            }).start();
          }

          s.current.currentScale = finalScale;
          s.current.tmpScale = 0;
        }

        // finalize translate
        if (s.current.tmpTranslate) {
          const { x, y } = s.current.tmpTranslate;
          const [topBound, leftBound, bottomBound, rightBound] = getBounds(
            s.current.currentScale
          );

          let nextTranslateX = x;
          let nextTranslateY = y;

          if (!fitsScreenByWidth()) {
            if (nextTranslateX > leftBound) nextTranslateX = leftBound;
            else if (nextTranslateX < rightBound) nextTranslateX = rightBound;
          }

          if (!fitsScreenByHeight()) {
            if (nextTranslateY > topBound) nextTranslateY = topBound;
            else if (nextTranslateY < bottomBound) nextTranslateY = bottomBound;
          }

          Animated.parallel([
            Animated.timing(translateValue.x, {
              toValue: nextTranslateX,
              duration: 120,
              useNativeDriver: true,
            }),
            Animated.timing(translateValue.y, {
              toValue: nextTranslateY,
              duration: 120,
              useNativeDriver: true,
            }),
          ]).start();

          s.current.currentTranslate = { x: nextTranslateX, y: nextTranslateY };
          s.current.tmpTranslate = null;
        }
      },

      onPanResponderTerminate: () => {
        // treat terminate like release
        cancelLongPress();
        s.current.isDoubleTapPerformed = false;
        s.current.pinchActive = false;
        s.current.tmpScale = 0;
        s.current.tmpTranslate = null;
      },

      onPanResponderTerminationRequest: () => false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cancelLongPress,
    delayLongPress,
    doubleTapToZoomEnabled,
    getBounds,
    getTranslateInBounds,
    fitsScreenByHeight,
    fitsScreenByWidth,
    initialScale,
    initialTranslate.x,
    initialTranslate.y,
    layout.width,
    layout.height,
    meaningfulShift,
    onLongPress,
  ]);

  return [
    panResponder.panHandlers,
    scaleValueRef.current,
    translateValueRef.current,
  ];
};

export default usePanResponder;
