import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const SLIDER_HEIGHT = 160;
const THUMB_SIZE = 20;

const CustomEQSlider = ({
  min,
  max,
  value,
  onValueChange,
  themeColors,
  disabled,
}) => {
  const positionToValue = (pos) => {
    return (pos / SLIDER_HEIGHT) * (min - max) + max;
  };
  
  const valueToPosition = (val) => {
    return ((val - max) / (min - max)) * SLIDER_HEIGHT;
  };

  const translateY = useSharedValue(valueToPosition(value));
  const isGestureActive = useSharedValue(false);

  const onGestureEvent = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startY = translateY.value;
      isGestureActive.value = true;
    },
    onActive: (event, ctx) => {
      let newY = ctx.startY + event.translationY;
      newY = Math.max(0, Math.min(SLIDER_HEIGHT, newY));
      translateY.value = newY;
    },
    onEnd: () => {
      isGestureActive.value = false;
      const finalValue = positionToValue(translateY.value);
      onValueChange(Math.round(finalValue)); // Snap to step 1
    },
  });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value - THUMB_SIZE / 2 },
      { scale: withSpring(isGestureActive.value ? 1.2 : 1) },
    ],
  }));

  const activeTrackStyle = useAnimatedStyle(() => ({
    height: SLIDER_HEIGHT - translateY.value,
  }));

  return (
    <View style={styles.container}>
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
    height: SLIDER_HEIGHT,
    width: THUMB_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    width: 2,
    height: '100%',
    borderRadius: 1,
    position: 'absolute',
    opacity: 0.5,
  },
  activeTrack: {
    width: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
  },
  thumbContainer: {
    position: 'absolute',
    top: 0,
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

export default CustomEQSlider; 