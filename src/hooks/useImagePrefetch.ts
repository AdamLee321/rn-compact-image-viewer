// @ts-nocheck
import { useEffect } from 'react';
import { Image } from 'react-native';
import { ImageSource } from '../types';

const useImagePrefetch = (images: ImageSource[]) => {
  useEffect(() => {
    images.forEach((image) => {
      //@ts-ignore
      if (image.uri) {
        //@ts-ignore
        return Image.prefetch(image.uri);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useImagePrefetch;
