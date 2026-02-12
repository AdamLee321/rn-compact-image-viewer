import { useState } from 'react';
import { Button } from 'react-native';
import { FullScreenImageViewer } from 'rn-compact-image-viewer';

export function App() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Button title="Open" onPress={() => setVisible(true)} />
      <FullScreenImageViewer
        visible={visible}
        onRequestClose={() => setVisible(false)}
        imageSrc={{ uri: 'https://picsum.photos/800/1200' }}
        doubleTapToZoomEnabled
      />
    </>
  );
}
