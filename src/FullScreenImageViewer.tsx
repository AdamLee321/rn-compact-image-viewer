// @ts-nocheck
import { useState } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  ModalProps,
  Modal,
  Platform,
} from 'react-native';

import ImageItem from './image/ImageItem';
import ImageDefaultHeader from './image/ImageDefaultHeader';
import StatusBarManager from './StatusBarManager';

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
  swipeToCloseEnabled?: boolean;
  doubleTapToZoomEnabled?: boolean;
  delayLongPress?: number;
  swipeCloseSensitivity?: number;
  actionIcon?: React.ReactNode;
  actionButtonStyle?: StyleProp<ViewStyle>;
  onActionPress?: () => void;
};

const DEFAULT_ANIMATION_TYPE = 'fade';
const DEFAULT_BG_COLOR = '#000';
const DEFAULT_DELAY_LONG_PRESS = 800;

function ImageViewing({
  imageSrc,
  visible,
  onRequestClose,
  onLongPress = () => {},
  animationType = DEFAULT_ANIMATION_TYPE,
  backgroundColor = DEFAULT_BG_COLOR,
  presentationStyle,
  swipeToCloseEnabled,
  doubleTapToZoomEnabled,
  delayLongPress = DEFAULT_DELAY_LONG_PRESS,
  swipeCloseSensitivity,
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
      <StatusBarManager
        presentationStyle={presentationStyle}
        visible={visible}
      />
      <View
        style={[styles.container, { opacity, backgroundColor }]}
        onLayout={(e) => {
          setLayout(e.nativeEvent.layout);
        }}
      >
        <Animated.View
          style={[styles.header, { transform: headerTransform }]}
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
          swipeToCloseEnabled={swipeToCloseEnabled}
          doubleTapToZoomEnabled={doubleTapToZoomEnabled}
          swipeCloseSensitivity={swipeCloseSensitivity}
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
