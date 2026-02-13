// @ts-nocheck
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  GestureResponderHandlers,
  NativeTouchEvent,
  PanResponderGestureState,
} from 'react-native';

import { Position, Dimensions } from '../types';
import {
  createPanResponder,
  getDistanceBetweenTouches,
  getImageTranslate,
  getImageDimensionsByTranslate,
} from '../utils';

const SCALE_MAX = 2;
const DOUBLE_TAP_DELAY = 300;
const OUT_BOUND_MULTIPLIER = 0.75;

// Treat “near initial” as initial to avoid drift + accidental pan.
const ZOOM_EPS = 0.02;

type Props = {
  initialScale: number;
  initialTranslate: Position;
  onZoom: (isZoomed: boolean) => void;
  doubleTapToZoomEnabled: boolean;
  layout: Dimensions;
};

type Touch2 = [
  { pageX: number; pageY: number },
  { pageX: number; pageY: number }
];

const copy2Touches = (touches: NativeTouchEvent[]): Touch2 | null => {
  const a = touches?.[0];
  const b = touches?.[1];
  if (!a || !b) return null;
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
  layout,
}: Props): Readonly<
  [GestureResponderHandlers, Animated.Value, Animated.ValueXY]
> => {
  // Keep Animated values stable across renders
  const scaleValue = useRef(new Animated.Value(initialScale)).current;
  const translateValue = useRef(new Animated.ValueXY(initialTranslate)).current;

  // Mutable gesture state
  const currentScaleRef = useRef(initialScale);
  const currentTranslateRef = useRef<Position>(initialTranslate);

  const tmpScaleRef = useRef(0);
  const tmpTranslateRef = useRef<Position | null>(null);

  const isDoubleTapRef = useRef(false);
  const lastTapTSRef = useRef<number | null>(null);

  const pinchActiveRef = useRef(false);
  const pinchStartTouchesRef = useRef<Touch2 | null>(null);
  const pinchStartScaleRef = useRef(initialScale);
  const pinchStartTranslateRef = useRef<Position>(initialTranslate);

  const isZoomed = (scale: number) => scale > initialScale + ZOOM_EPS;

  const imageDimensions = useMemo(
    () => getImageDimensionsByTranslate(initialTranslate, layout),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialTranslate.x, initialTranslate.y, layout.width, layout.height]
  );

  const getBounds = (scale: number) => {
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
  };

  const getTranslateInBounds = (translate: Position, scale: number) => {
    const inBoundTranslate = { x: translate.x, y: translate.y };
    const [topBound, leftBound, bottomBound, rightBound] = getBounds(scale);

    if (translate.x > leftBound) inBoundTranslate.x = leftBound;
    else if (translate.x < rightBound) inBoundTranslate.x = rightBound;

    if (translate.y > topBound) inBoundTranslate.y = topBound;
    else if (translate.y < bottomBound) inBoundTranslate.y = bottomBound;

    return inBoundTranslate;
  };

  const fitsScreenByWidth = () =>
    imageDimensions.width * currentScaleRef.current < layout.width;
  const fitsScreenByHeight = () =>
    imageDimensions.height * currentScaleRef.current < layout.height;

  // Only call onZoom when meaningfully zoomed
  useEffect(() => {
    const id = scaleValue.addListener(({ value }) => onZoom?.(isZoomed(value)));
    return () => scaleValue.removeListener(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onZoom, initialScale]);

  // When layout / initial transform changes (rotation, etc), reset
  useEffect(() => {
    scaleValue.setValue(initialScale);
    translateValue.setValue(initialTranslate);

    currentScaleRef.current = initialScale;
    currentTranslateRef.current = initialTranslate;

    tmpScaleRef.current = 0;
    tmpTranslateRef.current = null;

    pinchActiveRef.current = false;
    pinchStartTouchesRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialScale,
    initialTranslate.x,
    initialTranslate.y,
    layout.width,
    layout.height,
  ]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handlers = {
    onStart: (event: GestureResponderEvent) => {
      const touchesCount = event.nativeEvent.touches?.length ?? 0;
      if (touchesCount !== 1) return;

      const tapTS = Date.now();
      isDoubleTapRef.current = Boolean(
        lastTapTSRef.current && tapTS - lastTapTSRef.current < DOUBLE_TAP_DELAY
      );

      if (doubleTapToZoomEnabled && isDoubleTapRef.current) {
        const scaledNow = isZoomed(currentScaleRef.current);
        const { pageX: touchX, pageY: touchY } = event.nativeEvent.touches[0];

        const targetScale = SCALE_MAX;
        const nextScale = scaledNow ? initialScale : targetScale;

        const nextTranslate = scaledNow
          ? initialTranslate
          : getTranslateInBounds(
              {
                x:
                  initialTranslate.x +
                  (layout.width / 2 - touchX) *
                    (targetScale / currentScaleRef.current),
                y:
                  initialTranslate.y +
                  (layout.height / 2 - touchY) *
                    (targetScale / currentScaleRef.current),
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
          currentScaleRef.current = nextScale;
          currentTranslateRef.current = nextTranslate;
        });

        lastTapTSRef.current = null;
      } else {
        lastTapTSRef.current = tapTS;
      }
    },

    onMove: (
      event: GestureResponderEvent,
      gestureState: PanResponderGestureState
    ) => {
      const touchesCount = event.nativeEvent.touches?.length ?? 0;

      // Pinch
      if (touchesCount === 2) {
        const touches2 = copy2Touches(event.nativeEvent.touches);
        if (!touches2) return;

        if (!pinchActiveRef.current) {
          pinchActiveRef.current = true;
          pinchStartTouchesRef.current = touches2;
          pinchStartScaleRef.current = currentScaleRef.current;
          pinchStartTranslateRef.current = currentTranslateRef.current;
        }

        const initialDistance = getDistanceBetweenTouches(
          pinchStartTouchesRef.current as any
        );
        const currentDistance = getDistanceBetweenTouches(touches2 as any);
        if (!initialDistance || !currentDistance) return;

        let nextScale =
          (currentDistance / initialDistance) * pinchStartScaleRef.current;

        if (nextScale < initialScale) {
          nextScale =
            nextScale + (initialScale - nextScale) * OUT_BOUND_MULTIPLIER;
        }
        if (nextScale > SCALE_MAX) nextScale = SCALE_MAX;

        // Focal-point translate (prevents weird “axis” feel)
        const [t1, t2] = touches2;
        const focusX = (t1.pageX + t2.pageX) / 2;
        const focusY = (t1.pageY + t2.pageY) / 2;

        const cx = layout.width / 2;
        const cy = layout.height / 2;

        const ratio = nextScale / pinchStartScaleRef.current;
        const shiftX = (cx - focusX) * (ratio - 1);
        const shiftY = (cy - focusY) * (ratio - 1);

        const rawTranslate = {
          x: pinchStartTranslateRef.current.x + shiftX,
          y: pinchStartTranslateRef.current.y + shiftY,
        };

        const nextTranslate = getTranslateInBounds(rawTranslate, nextScale);

        translateValue.x.setValue(nextTranslate.x);
        translateValue.y.setValue(nextTranslate.y);
        tmpTranslateRef.current = nextTranslate;

        scaleValue.setValue(nextScale);
        tmpScaleRef.current = nextScale;

        return;
      }

      // 1-finger pan only when meaningfully zoomed (prevents “move up when back at initial”)
      if (touchesCount === 1 && isZoomed(currentScaleRef.current)) {
        const { x, y } = currentTranslateRef.current;
        const [topBound, leftBound, bottomBound, rightBound] = getBounds(
          currentScaleRef.current
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
            nextTranslateY - (nextTranslateY - topBound) * OUT_BOUND_MULTIPLIER;
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
        tmpTranslateRef.current = { x: nextTranslateX, y: nextTranslateY };
      }
    },

    onRelease: () => {
      pinchActiveRef.current = false;
      pinchStartTouchesRef.current = null;
      isDoubleTapRef.current = false;

      // Finalize scale
      if (tmpScaleRef.current > 0) {
        let finalScale = tmpScaleRef.current;
        if (finalScale < initialScale) finalScale = initialScale;
        if (finalScale > SCALE_MAX) finalScale = SCALE_MAX;

        // Snap tiny drift back to exact initial
        if (!isZoomed(finalScale)) finalScale = initialScale;

        if (finalScale !== tmpScaleRef.current) {
          Animated.timing(scaleValue, {
            toValue: finalScale,
            duration: 120,
            useNativeDriver: true,
          }).start();
        }

        currentScaleRef.current = finalScale;
        tmpScaleRef.current = 0;
      }

      // If we're at baseline scale, always re-center translate (THIS fixes your issue)
      if (!isZoomed(currentScaleRef.current)) {
        Animated.parallel([
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

        currentTranslateRef.current = initialTranslate;
        tmpTranslateRef.current = null;
        return;
      }

      // Otherwise finalize translate in bounds
      if (tmpTranslateRef.current) {
        const { x, y } = tmpTranslateRef.current;
        const [topBound, leftBound, bottomBound, rightBound] = getBounds(
          currentScaleRef.current
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

        currentTranslateRef.current = { x: nextTranslateX, y: nextTranslateY };
        tmpTranslateRef.current = null;
      }
    },
  };

  const panResponder = useMemo(() => createPanResponder(handlers), [handlers]);

  return [panResponder.panHandlers, scaleValue, translateValue];
};

export default usePanResponder;
