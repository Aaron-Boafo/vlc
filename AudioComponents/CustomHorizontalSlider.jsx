import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const THUMB_SIZE = 20;

const CustomHorizontalSlider = ({
  min,
  max,
  value,
  onValueChange,
  themeColors,
  disabled,
}) => {
  const { width } = useWindowDimensions();
  const SLIDER_WIDTH = width * 0.5; // Make it responsive

  const positionToValue = (pos) => {
    return (pos / SLIDER_WIDTH) * (max - min) + min;
  };
  
  const valueToPosition = (val) => {
    return ((val - min) / (max - min)) * SLIDER_WIDTH;
  };

  const translateX = useSharedValue(valueToPosition(value));
  const isGestureActive = useSharedValue(false);

  const onGestureEvent = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      isGestureActive.value = true;
    },
    onActive: (event, ctx) => {
      let newX = ctx.startX + event.translationX;
      newX = Math.max(0, Math.min(SLIDER_WIDTH, newX));
      translateX.value = newX;
    },
    onEnd: () => {
      isGestureActive.value = false;
      const finalValue = positionToValue(translateX.value);
      onValueChange(Math.round(finalValue));
    },
  });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - THUMB_SIZE / 2 },
      { scale: withSpring(isGestureActive.value ? 1.2 : 1) },
    ],
  }));

  const activeTrackStyle = useAnimatedStyle(() => ({
    width: translateX.value,
  }));

  return (
    <View style={[styles.container, { width: SLIDER_WIDTH }]}>
      <View style={[styles.track, { backgroundColor: themeColors.textSecondary }]} />
      <Animated.View style={[styles.activeTrack, { backgroundColor: themeColors.primary }, activeTrackStyle]} />
      <PanGestureHandler onGestureEvent={disabled ? undefined : onGestureEvent}>
        <Animated.View style={[styles.thumbContainer, thumbStyle]}>
          <View style={[styles.thumb, { borderColor: themeColors.primary }]} />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: THUMB_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    height: 2,
    width: '100%',
    borderRadius: 1,
    position: 'absolute',
    opacity: 0.5,
  },
  activeTrack: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
  },
  thumbContainer: {
    position: 'absolute',
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 3,
    backgroundColor: '#333',
  },
});

export default CustomHorizontalSlider; 