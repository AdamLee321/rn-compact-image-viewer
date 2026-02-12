import React from 'react';
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = {
  onRequestClose: () => void;
  actionIcon?: React.ReactNode;
  onActionPress?: () => void;
  actionButtonStyle?: StyleProp<ViewStyle>;
};

const HIT_SLOP = { top: 16, left: 16, bottom: 16, right: 16 };

const ImageDefaultHeader = ({
  onRequestClose,
  actionIcon,
  onActionPress,
  actionButtonStyle,
}: Props) => {
  const showAction = !!actionIcon && typeof onActionPress === 'function';

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.rightButtons}>
        {showAction && (
          <TouchableOpacity
            style={[styles.iconButton, actionButtonStyle]}
            onPress={onActionPress}
            hitSlop={HIT_SLOP}
          >
            {actionIcon}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onRequestClose}
          hitSlop={HIT_SLOP}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  rightButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingRight: 8,
    paddingTop: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#00000077',
  },
  closeText: {
    lineHeight: 22,
    fontSize: 19,
    textAlign: 'center',
    color: '#FFF',
    includeFontPadding: false,
  },
});

export default ImageDefaultHeader;
