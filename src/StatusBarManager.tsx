// @ts-nocheck
import { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';

type Props = {
  visible: boolean;
};

const StatusBarManager = ({ visible }: Props) => {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    StatusBar.setHidden(visible, 'fade');
    return () => StatusBar.setHidden(false, 'fade');
  }, [visible]);

  return null;
};

export default StatusBarManager;
