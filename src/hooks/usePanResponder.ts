// @ts-nocheck
import { useEffect, useMemo, useRef, useCallback } from 'react';
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

const ZOOM_EPS = 0.02;

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

  const scaleValue = useRef(new Animated.Value(initialScale)).current;
  const translateValue = useRef(new Animated.ValueXY(initialTranslate)).current;

  const state = useRef({
    currentScale: initialScale,
    currentTranslate: initialTranslate as Position,

    tmpScale: 0,
    tmpTranslate: null as Position | null,

    isDoubleTapPerformed: false,
    lastTapTS: null as number | null,

    longPressTimeout: null as any,

    pinchActive: false,
    pinchStartScale: initialScale,
    pinchStartTranslate: initialTranslate as Position,
    pinchStartTouches: [] as TouchPoint[],
  });

  const isZoomed = useCallback(
    (scale: number) => scale > initialScale + ZOOM_EPS,
    [initialScale]
  );

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

  const cancelLongPress = useCallback(() => {
    if (state.current.longPressTimeout) {
      clearTimeout(state.current.longPressTimeout);
      state.current.longPressTimeout = null;
    }
  }, []);

  useEffect(() => {
    const id = scaleValue.addListener(({ value }) => onZoom?.(isZoomed(value)));
    return () => scaleValue.removeListener(id);
  }, [scaleValue, onZoom, isZoomed]);

  useEffect(() => {
    scaleValue.setValue(initialScale);
    translateValue.setValue(initialTranslate);

    state.current.currentScale = initialScale;
    state.current.currentTranslate = initialTranslate;
    state.current.tmpScale = 0;
    state.current.tmpTranslate = null;
    state.current.pinchActive = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialScale,
    initialTranslate.x,
    initialTranslate.y,
    layout.width,
    layout.height,
  ]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: (evt) =>
          (evt.nativeEvent.touches?.length ?? 0) > 1,
        onMoveShouldSetPanResponderCapture: (evt) =>
          (evt.nativeEvent.touches?.length ?? 0) > 1,

        onPanResponderGrant: (evt: GestureResponderEvent) => {
          state.current.pinchActive = false;
          state.current.isDoubleTapPerformed = false;

          const touchesCount = evt.nativeEvent.touches?.length ?? 0;
          if (touchesCount === 1) {
            state.current.longPressTimeout = setTimeout(
              onLongPress,
              delayLongPress
            );
          } else {
            cancelLongPress();
          }
        },

        onPanResponderStart: (evt: GestureResponderEvent) => {
          const touchesCount = evt.nativeEvent.touches?.length ?? 0;
          if (touchesCount !== 1) return;

          const tapTS = Date.now();
          state.current.isDoubleTapPerformed = Boolean(
            state.current.lastTapTS &&
              tapTS - state.current.lastTapTS < DOUBLE_TAP_DELAY
          );

          if (doubleTapToZoomEnabled && state.current.isDoubleTapPerformed) {
            cancelLongPress();

            const scaledNow = isZoomed(state.current.currentScale);
            const { pageX: touchX, pageY: touchY } = evt.nativeEvent.touches[0];

            const targetScale = SCALE_MAX;
            const nextScale = scaledNow ? initialScale : targetScale;

            const nextTranslate = scaledNow
              ? initialTranslate
              : getTranslateInBounds(
                  {
                    x:
                      initialTranslate.x +
                      (layout.width / 2 - touchX) *
                        (targetScale / state.current.currentScale),
                    y:
                      initialTranslate.y +
                      (layout.height / 2 - touchY) *
                        (targetScale / state.current.currentScale),
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
              state.current.currentScale = nextScale;
              state.current.currentTranslate = nextTranslate;
            });

            state.current.lastTapTS = null;
          } else {
            state.current.lastTapTS = tapTS;
          }
        },

        onPanResponderMove: (
          evt: GestureResponderEvent,
          gestureState: PanResponderGestureState
        ) => {
          const touchesCount = evt.nativeEvent.touches?.length ?? 0;

          if (
            Math.abs(gestureState.dx) >= meaningfulShift ||
            Math.abs(gestureState.dy) >= meaningfulShift
          ) {
            cancelLongPress();
          }

          if (doubleTapToZoomEnabled && state.current.isDoubleTapPerformed) {
            cancelLongPress();
            return;
          }

          if (touchesCount === 2) {
            cancelLongPress();

            if (!state.current.pinchActive) {
              state.current.pinchActive = true;
              state.current.pinchStartScale = state.current.currentScale;
              state.current.pinchStartTranslate =
                state.current.currentTranslate;
              state.current.pinchStartTouches = copyTwoTouches(
                evt.nativeEvent.touches
              );
            }

            const initialDistance = getDistanceBetweenTouches(
              state.current.pinchStartTouches as any
            );
            const currentDistance = getDistanceBetweenTouches(
              copyTwoTouches(evt.nativeEvent.touches) as any
            );

            if (!initialDistance || !currentDistance) return;

            let nextScale =
              (currentDistance / initialDistance) *
              state.current.pinchStartScale;

            if (nextScale < initialScale) {
              nextScale =
                nextScale + (initialScale - nextScale) * OUT_BOUND_MULTIPLIER;
            }

            if (nextScale > SCALE_MAX) nextScale = SCALE_MAX;

            scaleValue.setValue(nextScale);
            state.current.tmpScale = nextScale;

            return;
          }

          if (touchesCount === 1) {
            const zoomedNow = isZoomed(state.current.currentScale);

            if (!zoomedNow) {
              translateValue.x.setValue(initialTranslate.x);
              translateValue.y.setValue(initialTranslate.y);
              state.current.tmpTranslate = null;
              return;
            }

            const { x, y } = state.current.currentTranslate;
            const [topBound, leftBound, bottomBound, rightBound] = getBounds(
              state.current.currentScale
            );

            let nextTranslateX = x + gestureState.dx;
            let nextTranslateY = y + gestureState.dy;

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

            translateValue.x.setValue(nextTranslateX);
            translateValue.y.setValue(nextTranslateY);
            state.current.tmpTranslate = {
              x: nextTranslateX,
              y: nextTranslateY,
            };
          }
        },

        onPanResponderRelease: () => {
          cancelLongPress();
          state.current.isDoubleTapPerformed = false;
          state.current.pinchActive = false;

          if (state.current.tmpScale > 0) {
            let finalScale = state.current.tmpScale;
            if (finalScale < initialScale) finalScale = initialScale;
            if (finalScale > SCALE_MAX) finalScale = SCALE_MAX;

            state.current.currentScale = finalScale;
            state.current.tmpScale = 0;
          }

          if (!isZoomed(state.current.currentScale)) {
            state.current.currentScale = initialScale;
            state.current.currentTranslate = initialTranslate;
            state.current.tmpTranslate = null;

            Animated.parallel([
              Animated.timing(scaleValue, {
                toValue: initialScale,
                duration: 120,
                useNativeDriver: true,
              }),
              Animated.timing(translateValue.x, {
                toValue: initialTranslate.x,
                duration: 120,
                useNativeDriver: true,
              }),
              Animated.timing(translateValue.y, {
                toValue: initialTranslate.y,
                duration: 120,
                useNativeDriver: true,
              }),
            ]).start();

            return;
          }

          if (state.current.tmpTranslate) {
            const { x, y } = state.current.tmpTranslate;
            const [topBound, leftBound, bottomBound, rightBound] = getBounds(
              state.current.currentScale
            );

            let nextTranslateX = x;
            let nextTranslateY = y;

            if (nextTranslateX > leftBound) nextTranslateX = leftBound;
            else if (nextTranslateX < rightBound) nextTranslateX = rightBound;

            if (nextTranslateY > topBound) nextTranslateY = topBound;
            else if (nextTranslateY < bottomBound) nextTranslateY = bottomBound;

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

            state.current.currentTranslate = {
              x: nextTranslateX,
              y: nextTranslateY,
            };
            state.current.tmpTranslate = null;
          }
        },

        onPanResponderTerminate: () => {
          cancelLongPress();
          state.current.isDoubleTapPerformed = false;
          state.current.pinchActive = false;
          state.current.tmpScale = 0;
          state.current.tmpTranslate = null;
        },

        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => false,
      }),
    [
      cancelLongPress,
      delayLongPress,
      doubleTapToZoomEnabled,
      getBounds,
      getTranslateInBounds,
      initialScale,
      initialTranslate,
      isZoomed,
      layout.height,
      layout.width,
      meaningfulShift,
      onLongPress,
      scaleValue,
      translateValue,
    ]
  );

  return [panResponder.panHandlers, scaleValue, translateValue];
};

export default usePanResponder;
