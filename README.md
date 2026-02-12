# Full Screen Image Viewer (React Native)

Lightweight full-screen image viewer with pinch/double-tap zoom and swipe-to-close for React Native.

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
import { FullScreenImageViewer } from 'rn-compact-image-viewer';

function Example() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Button title="Open" onPress={() => setVisible(true)} />
      <FullScreenImageViewer
        visible={visible}
        onRequestClose={() => setVisible(false)}
        imageSrc={{ uri: 'https://picsum.photos/800/1200' }}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        swipeCloseSensitivity={7}
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
- **swipeToCloseEnabled?**: Enable vertical swipe-to-close.
- **doubleTapToZoomEnabled?**: Enable double tap to zoom.
- **delayLongPress?**: Long-press delay (ms). Default: `800`.
- **swipeCloseSensitivity?**: 1 (hard) .. 10 (easy) velocity to close.
- **supportOrientations?**: Model supported orientations `["portrait", "landscape"]`. Default `["portrait"]`.

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
