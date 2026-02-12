// @ts-nocheck
import { useEffect } from 'react';
import { Platform, ModalProps, StatusBar } from 'react-native';

const StatusBarManager = ({
  presentationStyle,
}: {
  presentationStyle?: ModalProps['presentationStyle'];
}) => {
  if (Platform.OS === 'ios' || presentationStyle !== 'overFullScreen') {
    return null;
  }

  StatusBar.setHidden(true);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    return () => StatusBar.setHidden(false);
  }, []);

  return null;
};

export default StatusBarManager;
