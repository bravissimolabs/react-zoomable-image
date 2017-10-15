# React Zoomable Image
Zoomable image for mouse and touch devices. Built with React.

[Demo](https://bravissimolabs.github.io/react-zoomable-image/)

## Installation
```
npm install --save react-zoomable-image
```

## Example
```js
import React, { Component } from 'react';
import ZoomableImage from 'react-zoomable-image';

class Zoom extends Component {
  render() {
    return (
      <ZoomableImage
        baseImage={{
          alt: 'An image',
          src: 'http://via.placeholder.com/350x550',
          width: 350,
          height: 550
        }}
        largeImage={{
          alt: 'A large image',
          src: 'http://via.placeholder.com/450x707',
          width: 450,
          height: 707
        }}
        thumbnailImage={{
          alt: 'A small image',
          src: 'http://via.placeholder.com/70x110'
        }}
      />
    );
  }
}
```
### Props
```js
imageType: {
  alt: string,
  src: string,
  width: number,
  height: number
}

thumbnailType: {
  alt: string,
  src: string
}
```


| Property           | Type          | Description                                                                                                   |
|--------------------|---------------|---------------------------------------------------------------------------------------------------------------|
| baseImage          | imageType     | The initial image with no zoom applied. Rendered as an image element, with supplied width and height          |
| largeImage         | imageType     | The zoomed image. Width and height, relative to `baseImage`'s width and height, determine initial zoom level    |
| thumbnailImage     | thumbnailType | Small "map" image displayed in top left corner during zoom. Size determined by `mapScaleFactor` |
| displayMap         | bool          | Should a thumbnail map image be shown? Defaults to true                                                       |
| mapBorderColor     | string        | Color of border around the thumbnail map image                                                                |
| mapScaleFactor     | number        | Size of thumbnail map, relative to `baseImage`. Defaults to 0.2                                                 |
| zoomTransitionTime | number        | Duration of zoom-in and zoom-out transitions. Defaults to 300                                                 |

## Tests
Tested with Jest. To run tests, clone the project, install dependencies, and `npm run test`