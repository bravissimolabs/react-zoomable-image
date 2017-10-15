/* eslint-env jest */
/* eslint import/first:"off" */
/* eslint react/jsx-filename-extension:"off" */

jest.unmock('./index.jsx');
import React from 'react';
import renderer from 'react-test-renderer';
import Enzyme, { shallow, mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import ZoomableImage from './index';
import cloneDeep from 'lodash/cloneDeep';
import zipWith from 'lodash/zipWith';

Enzyme.configure({ adapter: new Adapter() });

const props = cloneDeep({
  baseImage: {
    alt: 'An image for test rendering',
    src: 'http://via.placeholder.com/350x550',
    width: 350,
    height: 550
  },
  largeImage: {
    alt: 'A large image for test rendering',
    src: 'http://via.placeholder.com/450x707',
    width: 450,
    height: 707
  },
  thumbnailImage: {
    alt: 'A small image for test rendering',
    src: 'http://via.placeholder.com/70x110'
  }
});

const baseDimensions = [props.baseImage.width, props.baseImage.height];
const largeDimensions = [props.largeImage.width, props.largeImage.height];

describe('Product Gallery Zoom', () => {
  beforeEach(() => {
    global.window.requestAnimationFrame = cb => cb();
  });

  it('should render correctly', () => {
    const tree = renderer.create(<ZoomableImage {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  const calcExpectedBackgroundPosition = (focus, imageDimensions) =>
    zipWith(focus, imageDimensions, (f, iD) => Math.round((f / iD) * 1000) / 10);

  const defaultPosition = [100, 200];

  const mousePosition = {
    nativeEvent: {
      offsetX: defaultPosition[0],
      offsetY: defaultPosition[1]
    }
  };


  const dragPositionBase = {
    preventDefault: () => {},
    stopPropagation: () => {}
  };

  const dragPositionRightAndDown = {
    ...dragPositionBase,
    targetTouches: [{
      clientX: defaultPosition[0] + 10,
      clientY: defaultPosition[1] + 10
    }]
  };

  const dragPositionLeftAndUp = {
    ...dragPositionBase,
    targetTouches: [{
      clientX: defaultPosition[0] - 10,
      clientY: defaultPosition[1] - 10
    }]
  };

  describe('View window positioning', () => {
    it('should set the view window to the mouse position', () => {
      const wrapper = shallow(<ZoomableImage {...props} />);
      wrapper.instance().calcBackgroundOffsetFromMouse(mousePosition);
      expect(wrapper.state('viewWindowPosition')).toEqual([100, 200]);
    });

    describe('Initial focus', () => {
      const initialClick = [300, 400];
      const mockedClickEvent = {
        nativeEvent: {
          offsetX: initialClick[0],
          offsetY: initialClick[1]
        }
      };
      const mockedTouchEvent = {
        changedTouches: [{
          clientX: initialClick[0],
          clientY: initialClick[1]
        }]
      };
      it('should set the initial focal point based on click position', () => {
        const wrapper = mount(<ZoomableImage {...props} />);
        wrapper.find('div[data-name="wrapper"]').simulate('mouseDown', mockedClickEvent);

        const style = wrapper.find('div[data-name="zoom-image"]').get(0).props.style;
        const [xPercent, yPercent] = calcExpectedBackgroundPosition(initialClick, baseDimensions);

        expect(style.backgroundPosition).toBe(`${xPercent}% ${yPercent}%`);
      });
      it('should set the initial focal point based on tap position', () => {
        const wrapper = mount(<ZoomableImage {...props} />);
        wrapper.find('div[data-name="wrapper"]').simulate('touchStart');
        wrapper.find('div[data-name="wrapper"]').simulate('touchEnd', mockedTouchEvent);

        const style = wrapper.find('div[data-name="zoom-image"]').get(0).props.style;
        const [xPercent, yPercent] = calcExpectedBackgroundPosition(initialClick, baseDimensions);

        expect(style.backgroundPosition).toBe(`${xPercent}% ${yPercent}%`);
      });
    });
  });

  describe('Image dimension based calculations', () => {
    it('should set the background position based on the mouse position', () => {
      const wrapper = mount(<ZoomableImage {...props} />);
      wrapper.find('div[data-name="zoom-wrapper"]').simulate('mousemove', mousePosition);

      const style = wrapper.find('div[data-name="zoom-image"]').props().style;

      const { offsetX, offsetY } = mousePosition.nativeEvent;
      const [xPercent, yPercent] = calcExpectedBackgroundPosition([offsetX, offsetY], [props.baseImage.width, props.baseImage.height]);
      expect(style.backgroundPosition).toBe(`${xPercent}% ${yPercent}%`);
    });


    it('should set the background position based on drag movement', () => {
      const viewWindowPosition = [100, 100];
      const wrapper = mount(<ZoomableImage {...props} />);
      const zoomLevel = 1.2;
      wrapper.setState({
        previousDragPosition: defaultPosition,
        viewWindowPosition,
        zoomLevel
      });
      // NOTE: directly calling function here, rather than simulating, because the component
      // attaches touch event listeners through refs in order to pass a passive option to the
      // listener. Simulate can only be used for React synthetic events, and does not work here.
      wrapper.instance().calcBackgroundOffsetFromDrag(dragPositionRightAndDown);


      const { clientX, clientY } = dragPositionRightAndDown.targetTouches[0];
      const dragScale = 3 / (zoomLevel * zoomLevel);
      const delta = zipWith(defaultPosition, [clientX, clientY], (p, c) => ((p - c) * dragScale));
      const newFocus = zipWith(viewWindowPosition, delta, (v, d) => v + d);
      const largeImageSize = [props.largeImage.width, props.largeImage.height];

      const [xPercent, yPercent] = calcExpectedBackgroundPosition(newFocus, largeImageSize);
      wrapper.update();
      const { style } = wrapper.find('div[data-name="zoom-image"]').props();
      expect(style.backgroundPosition).toBe(`${xPercent}% ${yPercent}%`);
    });
    // Skipping test for going out of bounds in mouse hover mode, because it
    // is mathematically impossible (when your hover exits the frame, the view window stops moving)
    it('should not allow the view window to go out of bounds when in drag mode', () => {
      const wrapper = mount(<ZoomableImage
        {...props}
      />);
      wrapper.setState({
        previousDragPosition: defaultPosition,
        viewWindowPosition: [props.largeImage.width, props.largeImage.height],
        calcMovementFromDrag: true
      });
      wrapper.instance().calcBackgroundOffsetFromDrag(dragPositionLeftAndUp);
      const { style } = wrapper.find('div[data-name="zoom-image"]').props();

      expect(style.backgroundPosition).toBe(`${100}% ${100}%`);
    });

    it('should be moveable from the corner', () => {
      const wrapper = mount(<ZoomableImage
        {...props}
      />);
      const viewWindowPosition = [props.largeImage.width, props.largeImage.height];
      const zoomLevel = 1.2;
      wrapper.setState({
        previousDragPosition: defaultPosition,
        calcMovementFromDrag: true,
        viewWindowPosition,
        zoomLevel
      });
      wrapper.instance().calcBackgroundOffsetFromDrag(dragPositionRightAndDown);
      wrapper.update();
      const { style } = wrapper.find('div[data-name="zoom-image"]').props();

      const { clientX, clientY } = dragPositionRightAndDown.targetTouches[0];
      const dragScale = 3 / (zoomLevel * zoomLevel);
      const delta = zipWith(defaultPosition, [clientX, clientY], (p, c) => (p - c) * dragScale);
      const newFocus = zipWith(viewWindowPosition, delta, (v, d) => v + d);
      const actualZoomedImageSize = viewWindowPosition;

      const [xPercent, yPercent] = calcExpectedBackgroundPosition(newFocus, actualZoomedImageSize);

      expect(style.backgroundPosition).toBe(`${xPercent}% ${yPercent}%`);
    });
  });
});
