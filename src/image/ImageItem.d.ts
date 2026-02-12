// @ts-nocheck
import React from 'react';
import { ImageSource, Dimensions } from './@types';

declare type Props = {
  imageSrc: ImageSource;
  onRequestClose: () => void;
  onZoom: (isZoomed: boolean) => void;
  swipeToCloseEnabled?: boolean;
  doubleTapToZoomEnabled?: boolean;
  layout: Dimensions;
};

declare const _default: React.MemoExoticComponent<
  ({
    imageSrc,
    onZoom,
    onRequestClose,
    swipeToCloseEnabled,
    layout,
  }: Props) => JSX.Element
>;

export default _default;
