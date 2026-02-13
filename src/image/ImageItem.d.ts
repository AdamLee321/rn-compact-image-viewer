import React from 'react';
import { ImageSource } from '../../@types';

declare type Props = {
  imageSrc: ImageSource;
  onZoom: (isZoomed: boolean) => void;
  onLongPress: (image: ImageSource) => void;
  delayLongPress: number;
  doubleTapToZoomEnabled?: boolean;
};

declare const _default: React.MemoExoticComponent<
  ({ imageSrc, onZoom, onLongPress, delayLongPress }: Props) => JSX.Element
>;

export default _default;
