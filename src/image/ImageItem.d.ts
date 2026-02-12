// @ts-nocheck
import React from 'react';
import { ImageSource, Dimensions } from './@types';

declare type Props = {
  imageSrc: ImageSource;
  onZoom: (isZoomed: boolean) => void;
  doubleTapToZoomEnabled?: boolean;
  layout: Dimensions;
};

declare const _default: React.MemoExoticComponent<
  ({ imageSrc, onZoom, layout }: Props) => JSX.Element
>;

export default _default;
