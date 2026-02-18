# Full Screen Image Viewer (React Native)

Lightweight full-screen image viewer with pinch/double-tap zoom for React Native with orientation support.

## Installation

```bash
npm install rn-compact-image-viewer
# or
yarn add rn-compact-image-viewer
```

### Peer dependencies

- react: >=18
- react-native: >=0.72

## Quick start

```tsx
import { useState } from 'react';
import { Button } from 'react-native';
import {
  CompactImageViewer,
  FullScreenImageViewer,
} from 'rn-compact-image-viewer';

function Example() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <CompactImageViewer
        imageSrc={eventImage}
        visible={fullscreenImageVisible}
        fullscreenButtonIcon={<Icon name="fullscreen" size={20} color="#fff" />}
        actionIcon={<OctIcon name="download" size={20} color="#fff" />}
        onActionPress={() => handleSnapshot(event)}
        onRequestClose={() => {
          setFullscreenImageVisible(false);
        }}
        onFullscreenPress={() => {
          setFullscreenImageVisible(true);
        }}
        doubleTapToZoomEnabled
      />
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
```

## Props

- **imageSrc**: Image source.
- **visible**: Controls modal visibility.
- **onRequestClose**: Called to close viewer.
- **onLongPress?**: Long-press callback.
- **presentationStyle?**: Modal presentation style.
- **animationType?**: Modal animation type. Default: `"fade"`.
- **backgroundColor?**: Background color. Default: `"#000"`.
- **doubleTapToZoomEnabled?**: Enable double tap to zoom.
- **delayLongPress?**: Long-press delay (ms). Default: `800`.

## TypeScript

Type definitions are included. Import types as needed:

```ts
import type { FullScreenImageViewerProps } from 'rn-compact-image-viewer';
```

## License

MIT

## Links

- Credit: https://github.com/imranshad/rn-full-screen-image-viewer
- Repository: https://github.com/adamlee321/rn-full-screen-image-viewer
- Issues: https://github.com/adamlee321/rn-full-screen-image-viewer/issues
