/* global document, window */
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import zipWith from 'lodash/zipWith';
import { Manager, Pinch } from 'hammerjs';

const magPlus = require('./magnify.svg');
const magMinus = require('./magMinus.svg');

const isEqual = (arr1, arr2) => {
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
};

const styles = {
  wrapper: {
    position: 'relative',
    zIndex: 1,
  },

  image: {
    position: 'relative',
    transitionProperty: 'z-index',
    width: '100%',
    height: '100%',
  },

  zoomContainer: {
    position: 'absolute',
    top: 0,
  },

  innerMap: {
    position: 'absolute',
    top: 10,
    left: 10,
    pointerEvents: 'none',
  },

  innerMapImage: {
    width: '101%',
    height: 'auto',
  },

  innerMapHighlightBox: {
    position: 'absolute',
    backgroundColor: 'rgba(140, 137, 131, 0.6)',
  },

  zoomedImage: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'transparent',
    backgroundRepeat: 'no-repeat',
  },
};

const isInBounds = (coordinates, upperBounds) => {
  let flag = true;
  coordinates.forEach((marker, i) => {
    if (marker <= 0 || marker >= upperBounds[i]) {
      flag = false;
    }
  });
  return flag;
};

const nearestInBoundsPosition = (loc, bounds) => loc.map((p, i) => Math.min(p, bounds[i]));

class ZoomableImage extends Component {
  /**
   * Sets initial size of images, and zoom level into state
   * @param {*} props
   */
  constructor(props) {
    super(props);

    this.state = {
      zoomed: 0,
      zoomLevel: props.baseImage.width / props.largeImage.width,
      defaultZoomLevel: 1.2,
      viewWindowPosition: [0, 0],
      dragFocalPoint: [0, 0],
      lastClickToZoomPosition: [-1, -1],
      isCalculatingZoom: false,
      isDragging: false,
      calcMovementFromDrag: false,
      pageClickHandlersAreAdded: false,
      transitionZoomBackground: true,
      isStartingZoom: false,
      isEndingZoom: false
    };
  }

  /**
   * This is all a workaround to handle chrome disabling e.preventDefault()
   * unless you specify to enable it. Unfortunately this cannot be done through
   * React synthetic events
   */
  componentDidMount() {
    this.bodyClickHandlers = [['click', this.endZoom], ['touchstart', this.checkForTap], ['touchend', this.onTouchEnd]];
    let passiveSupported = false;
    try {
      const options = Object.defineProperty({}, 'passive', {
        get: () => {
          passiveSupported = true;
        },
      });
      document.querySelector('body').addEventListener('test', null, options);
    } catch (err) {
      passiveSupported = false;
    }
    const passive = passiveSupported ? { passive: false } : false;
    if (this.zoomContainer) {
      this.zoomContainer.addEventListener('touchmove', this.calcBackgroundOffsetFromDrag, passive);
      this.zoomContainer.addEventListener('touchstart', this.onZoomWindowTouchStart, passive);
      this.zoomContainer.addEventListener('touchend', this.onTouchEnd, passive);
      // Initialize Hammer
      this.mc = new Manager(this.zoomContainer);
      this.mc.add(new Pinch());
      this.mc.on('pinchin', this.handleZoom);
      this.mc.on('pinchout', this.handleZoom);
    }
  }

  /**
   * Make sure we don't leave any garbage behind
   */
  componentWillUnmount() {
    this.removeBodyClickHandlers();
  }


  startZoom = (initialFocalPoint, isTouchDevice) => {
    if (isTouchDevice) this.setState({ calcMovementFromDrag: true });
    if (!isEqual(this.state.viewWindowPosition, initialFocalPoint)) {
      const { baseImage: { width }, largeImage } = this.props;
      const largeWidth = largeImage.width;
      const largeHeight = largeImage.height;
      const largeImageSize = [largeWidth, largeHeight];

      let startingFocus = isTouchDevice
        ? initialFocalPoint.map(p => p * (largeWidth / width))
        : initialFocalPoint;

      if (isTouchDevice && !isInBounds(startingFocus, largeImageSize)) {
        startingFocus = nearestInBoundsPosition(startingFocus, largeImageSize);
      }
      this.setState({
        viewWindowPosition: startingFocus,
        lastClickToZoomPosition: initialFocalPoint,
        calcMovementFromDrag: isTouchDevice,
      });
    }
    this.setState({
      zoomed: 1,
      zoomLevel: this.state.defaultZoomLevel,
      pageClickHandlersAreAdded: true,
      isStartingZoom: true
    });

    // Turning off transitions so there is no delay between mousemove and the background
    // image repositioning
    setTimeout(
      () => {
        this.addBodyClickHandlers();
        this.setState({
          transitionZoomBackground: false,
          isStartingZoom: false
        });
      },
      this.props.zoomTransitionTime
    );
  };

  endZoom = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomLevel = this.props.baseImage.width / this.props.largeImage.width;
    // Transitioning out of zoom view
    this.removeBodyClickHandlers();
    this.setState({
      zoomed: 0,
      zoomLevel,
      pageClickHandlersAreAdded: false,
      transitionZoomBackground: true,
      isEndingZoom: true
    });
    setTimeout(() => {
      this.setState({ isEndingZoom: false });
    }, this.props.zoomTransitionTime);
  };

  onZoomWindowTouchStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.targetTouches) {
      this.setState({
        isDragging: true,
        previousDragPosition: [e.targetTouches[0].clientX, e.targetTouches[0].clientY],
      });
    }
    this.checkForTap();
  };

  onTouchEnd = (e) => {
    // If this was a tap, not a drag, close the zoom view
    if (this.state.listeningForSingleClick) {
      this.endZoom(e);
    } else {
      e.stopPropagation();
      e.preventDefault();
    }
    this.setState({ isDragging: false });
  };

  /**
   * Close zoom view following a click or tap anywhere on the page
   */
  addBodyClickHandlers = () => {
    if (document && document.querySelector) {
      if (!this.bodyElement) this.bodyElement = document.querySelector('body');
      this.bodyClickHandlers.forEach((handler) => {
        this.bodyElement.addEventListener(...handler);
      });
    }
  };

  removeBodyClickHandlers = () => {
    if (document && document.querySelector) {
      this.bodyClickHandlers.forEach((handler) => {
        this.bodyElement.removeEventListener(...handler);
      });
    }
  };

  calcBackgroundOffsetFromMouse = (e) => {
    if (!this.state.isDragging && e.nativeEvent) {
      if (this.state.calcMovementFromDrag) this.setState({ calcMovementFromDrag: false });
      const { offsetX, offsetY } = e.nativeEvent;
      const viewWindowPosition = [offsetX, offsetY];
      window.requestAnimationFrame(() => {
        this.setState({ viewWindowPosition });
      });
    }
  };

  calcBackgroundOffsetFromDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!this.state.calcMovementFromDrag) this.setState({ calcMovementFromDrag: true });

    const { zoomLevel, previousDragPosition, viewWindowPosition } = this.state;
    const { largeImage } = this.props;
    const largeImageSize = [largeImage.width, largeImage.height];

    if (e.targetTouches) {
      const currentDragPosition = [e.targetTouches[0].clientX, e.targetTouches[0].clientY];

      // Translate the view window focal point by the drag distance
      const dragScale = 3 / (zoomLevel * zoomLevel);
      const newFocus = zipWith(viewWindowPosition, currentDragPosition, previousDragPosition, (f, c, p) => f + ((p - c) * dragScale));

      if (isInBounds(newFocus, largeImageSize)) {
        window.requestAnimationFrame(() => {
          this.setState({
            viewWindowPosition: newFocus,
            previousDragPosition: currentDragPosition,
          });
        });
      }
    }
  };

  checkForTap = () => {
    this.setState({ listeningForSingleClick: true });
    setTimeout(() => this.setState({ listeningForSingleClick: false }), 200);
  };

  pauseZoom = () => this.setState({ isCalculatingZoom: true });

  resumeZoom = () => this.setState({ isCalculatingZoom: false });

  handleZoom = (e) => {
    e.preventDefault();
    const { zoomLevel } = this.state;
    if (!this.state.isCalculatingZoom && zoomLevel <= 2 && zoomLevel >= 0) {
      if ((e.type === 'pinchout' || e.deltaY < 0) && zoomLevel < 2) {
        this.zoom(0.05);
      } else if ((e.type === 'pinchin' || e.deltaY > 0) && zoomLevel > 1) {
        this.zoom(-0.05);
      }
    }
  };

  zoom = (delta) => {
    this.pauseZoom();
    const zoomLevel = Math.round((this.state.zoomLevel + delta) * 100) / 100;
    this.setState({ zoomLevel }, this.resumeZoom);
  };

  /**
   * Renders.
   * @returns {*}
   */
  render() {
    const { baseImage, largeImage, thumbnailImage, displayMap, zoomTransitionTime, mapBorderColor, mapScaleFactor } = this.props;

    const {
      zoomed,
      viewWindowPosition,
      zoomLevel,
      calcMovementFromDrag,
      transitionZoomBackground,
      isStartingZoom,
      listeningForSingleClick,
      isEndingZoom,
      isTouch
    } = this.state;

    const { width, height } = baseImage;
    const largeWidth = largeImage.width;
    const largeHeight = largeImage.height;
    const baseToZoomRatio = width / (largeWidth * zoomLevel);
    const referencePosition = calcMovementFromDrag ? [largeWidth, largeHeight] : [width, height];
    const viewWindowPercent = viewWindowPosition.map(
      (offset, i) => Math.round(offset / referencePosition[i] * 1000) / 10,
    );

    return (
      <div
        data-name="wrapper"
        style={{ ...styles.wrapper, width, height, cursor: `url(${zoomed ? magMinus : magPlus}), pointer` }}
        onMouseDown={(e) => {
          if (!zoomed && !isTouch) {
            this.startZoom([e.nativeEvent.offsetX, e.nativeEvent.offsetY], false);
          }
        }}
        onTouchStart={(e) => {
          if (!zoomed) {
            e.preventDefault();
            e.stopPropagation();
            this.setState({ listeningForSingleClick: true, isTouch: true });
            setTimeout(() => {
              this.setState({ listeningForSingleClick: false });
            }, 200);
            setTimeout(() => {
              this.setState({ isTouch: false });
            }, 2000);
          }
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!zoomed && listeningForSingleClick && !isEndingZoom) {
            const { x, y } = e.target.getBoundingClientRect();
            this.startZoom([e.changedTouches[0].clientX - (x || 0), e.changedTouches[0].clientY - (y || 0)], true);
          }
        }}
      >
        <img
          src={baseImage.src}
          alt={baseImage.alt}
          style={{
            ...styles.image,
            zIndex: zoomed ? -1 : 1,
            transitionDelay: `${zoomTransitionTime}ms`,
          }}
        />
        <div
          data-name="zoom-wrapper"
          ref={(domNode) => {
            this.zoomContainer = domNode;
          }}
          onMouseMove={this.calcBackgroundOffsetFromMouse}
          onWheel={this.handleZoom}
          style={{ ...styles.zoomContainer, width, height, zIndex: zoomed * 100 }}
        >
          {displayMap && (
            <div
              style={{
                ...styles.innerMap,
                width: width * mapScaleFactor,
                height: height * mapScaleFactor,
                zIndex: zoomed * 200,
                border: `2px solid ${mapBorderColor}`,

              }}
            >
              <img style={styles.innerMapImage} src={thumbnailImage.src} alt={thumbnailImage.alt || 'thumbnail'} />
              <div
                data-name="map-highlight"
                style={{
                  ...styles.innerMapHighlightBox,
                  width: `${baseToZoomRatio * 100}%`,
                  height: `${baseToZoomRatio * 100}%`,
                  left: `${viewWindowPercent[0] * (1 - baseToZoomRatio)}%`,
                  top: `${viewWindowPercent[1] * (1 - baseToZoomRatio)}%`,
                }}
              />
            </div>
          )}
          <div
            data-name="zoom-image"
            onClick={(e) => {
              if (zoomed && !isStartingZoom) this.endZoom(e);
            }}
            style={{
              ...styles.zoomedImage,
              width,
              height,
              zIndex: zoomed * 110,
              backgroundPosition: viewWindowPercent.map(p => `${p}%`).join(' '),
              backgroundSize: `${Math.round(largeWidth * zoomLevel)}px ${Math.round(largeHeight * zoomLevel)}px`,
              backgroundImage: `url(${largeImage.src})`,
              transition: transitionZoomBackground ? `background-size ${zoomTransitionTime}ms ease-in-out` : 'none',
            }}
          />
        </div>
      </div>
    );
  }
}

const imageShape = {
  alt: PropTypes.string.isRequired,
  src: PropTypes.string.isRequired,
};
const sizedImageShape = {
  ...imageShape,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};

ZoomableImage.propTypes = {
  baseImage: PropTypes.shape(sizedImageShape).isRequired,
  displayMap: PropTypes.bool,
  largeImage: PropTypes.shape(sizedImageShape).isRequired,
  mapBorderColor: PropTypes.string,
  mapScaleFactor: PropTypes.number,
  thumbnailImage: PropTypes.shape(imageShape),
  zoomTransitionTime: PropTypes.number,
};

ZoomableImage.defaultProps = {
  zoomTransitionTime: 300,
  displayMap: true,
  mapBorderColor: 'grey',
  mapScaleFactor: 0.2,
  thumbnailImage: { alt: '', src: '' }
};

export default ZoomableImage;
