// @ts-nocheck
import { useState } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  ModalProps,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';

import ImageItem from './image/ImageItem';
import ImageDefaultHeader from './image/ImageDefaultHeader';

import useAnimatedComponents from './hooks/useAnimatedComponents';
import useRequestClose from './hooks/useRequestClose';
import { ImageSource, Dimensions } from './types';

export type Props = {
  imageSrc: ImageSource;
  visible: boolean;
  onRequestClose: () => void;
  onLongPress?: (image: ImageSource) => void;
  presentationStyle?: ModalProps['presentationStyle'];
  animationType?: ModalProps['animationType'];
  backgroundColor?: string;
  doubleTapToZoomEnabled?: boolean;
  delayLongPress?: number;
  actionIcon?: React.ReactNode;
  actionButtonStyle?: StyleProp<ViewStyle>;
  onActionPress?: () => void;
};

const DEFAULT_ANIMATION_TYPE = 'fade';
const DEFAULT_BG_COLOR = '#fff';
const DEFAULT_DELAY_LONG_PRESS = 800;

function ImageViewing({
  imageSrc,
  visible,
  onRequestClose,
  onLongPress = () => {},
  animationType = DEFAULT_ANIMATION_TYPE,
  backgroundColor = DEFAULT_BG_COLOR,
  presentationStyle,
  doubleTapToZoomEnabled,
  delayLongPress = DEFAULT_DELAY_LONG_PRESS,
  actionIcon,
  actionButtonStyle,
  onActionPress,
}: Props) {
  const [opacity, onRequestCloseEnhanced] = useRequestClose(onRequestClose);
  const [headerTransform] = useAnimatedComponents();
  const [layout, setLayout] = useState<Dimensions>({
    width: 0,
    height: 0,
  });

  if (!visible) {
    return null;
  }

  const normalizedSrc =
    typeof imageSrc === 'string' ? { uri: imageSrc } : imageSrc;

  const isTransparent =
    Platform.OS === 'ios' && presentationStyle === 'overFullScreen';

  const androidStatusBar =
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 20 : 0;

  return (
    <Modal
      transparent={isTransparent}
      statusBarTranslucent={true}
      visible={visible}
      presentationStyle={presentationStyle}
      animationType={animationType}
      onRequestClose={onRequestCloseEnhanced}
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
      hardwareAccelerated
    >
      <View
        style={[styles.container, { opacity, backgroundColor }]}
        onLayout={(e) => {
          setLayout(e.nativeEvent.layout);
        }}
      >
        <Animated.View
          style={[
            styles.header,
            // eslint-disable-next-line react-native/no-inline-styles
            {
              transform: headerTransform,
              paddingTop: Platform.OS === 'android' ? androidStatusBar : 0,
            },
          ]}
          getItemLayout={(_, index) => ({
            length: layout.width,
            offset: layout.width * index,
            index,
          })}
        >
          <ImageDefaultHeader
            onRequestClose={onRequestCloseEnhanced}
            actionIcon={actionIcon}
            onActionPress={onActionPress}
            actionButtonStyle={actionButtonStyle}
          />
        </Animated.View>
        <ImageItem
          onZoom={() => {}}
          imageSrc={normalizedSrc}
          onRequestClose={onRequestCloseEnhanced}
          onLongPress={onLongPress}
          delayLongPress={delayLongPress}
          doubleTapToZoomEnabled={doubleTapToZoomEnabled}
          layout={layout}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    width: '100%',
    zIndex: 1,
    top: 0,
  },
  footer: {
    position: 'absolute',
    width: '100%',
    zIndex: 1,
    bottom: 0,
  },
});

const EnhancedImageViewing = (props: Props) => <ImageViewing {...props} />;

export default EnhancedImageViewing;
