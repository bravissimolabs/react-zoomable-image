import React, { Component } from 'react';
import Zoom from '../node_modules/react-zoomable-image';

import './App.css';

class App extends Component {
  render() {
    return (
      <div className="App">
        <h2>With a thumbnail map</h2>
          <Zoom 
            baseImage={{
              alt: 'An image for test rendering',
              src: 'http://eskipaper.com/images/grumpy-cat-2.jpg',
              width: 346,
              height: 260
            }}
            largeImage={{
              alt: 'A large image for test rendering',
              src: 'http://eskipaper.com/images/grumpy-cat-2.jpg',
              width: 346 * 1.5,
              height: 260 * 1.5
            }}
            thumbnailImage={{
              alt: 'A small image for test rendering',
              src: 'http://eskipaper.com/images/grumpy-cat-2.jpg'
            }}
            mapBorderColor="darkgoldenrod"
          />
          <h2>Without a thumbnail map</h2>
          <Zoom 
            baseImage={{
              alt: 'An image for test rendering',
              src: 'http://img.thedailybeast.com/image/upload/v1492724029/articles/2013/08/07/grumppuccino-a-look-at-the-new-coffee-line-by-famed-internet-meme-grumpy-cat/130806-grumpy-cat-coffee-stern-tease_ex25qb.jpg',
              width: 370,
              height: 260
            }}
            largeImage={{
              alt: 'A large image for test rendering',
              src: 'http://img.thedailybeast.com/image/upload/v1492724029/articles/2013/08/07/grumppuccino-a-look-at-the-new-coffee-line-by-famed-internet-meme-grumpy-cat/130806-grumpy-cat-coffee-stern-tease_ex25qb.jpg',
              width: 370 * 1.5,
              height: 260 * 1.5
            }}
            thumbnailImage={{
              alt: 'A small image for test rendering',
              src: 'http://img.thedailybeast.com/image/upload/v1492724029/articles/2013/08/07/grumppuccino-a-look-at-the-new-coffee-line-by-famed-internet-meme-grumpy-cat/130806-grumpy-cat-coffee-stern-tease_ex25qb.jpg'
            }}
            displayMap={false}
          />
      </div>
    );
  }
}

export default App;
