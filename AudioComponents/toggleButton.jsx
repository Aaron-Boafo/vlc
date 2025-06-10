import React, {useCallback, useMemo, useRef} from "react";
import {View, Text, TouchableOpacity, Animated, Easing} from "react-native";
import {
  LayoutGrid,
  ListVideo,
  Disc3,
  SquareUserRound,
  Clock,
  Heart,
} from "lucide-react-native";
import ThemeStore from "../store/theme";
import AudioStore from "../store/AudioHeadStore";

const ToggleButton = ({activePage = "All", scrollTo}) => {
  const {themeColors} = ThemeStore();
  const {toggleTabs} = AudioStore();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Memoize the tags array to prevent recreation on every render
  const tags = useMemo(
    () => [
      {name: "All", Icon: LayoutGrid},
      {name: "Playlist", Icon: ListVideo},
      {name: "Album", Icon: Disc3},
      {name: "Artist", Icon: SquareUserRound},
      {name: "History", Icon: Heart},
    ],
    []
  );

  // Animated press handler
  const handlePress = useCallback(
    (name, index) => {
      // Button press animation
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.8,
            duration: 80,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 120,
            easing: Easing.out(Easing.elastic(1)),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      toggleTabs(name, index);

      // Smooth scroll animation
      Animated.timing(new Animated.Value(0), {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        scrollTo(index);
      });
    },
    [scrollTo, toggleTabs, scaleAnim, opacityAnim]
  );

  // Pre-calculate styles that don't change
  const containerStyle = useMemo(
    () => ({
      backgroundColor: "#282828",
      flexDirection: "row",
      padding: 5,
      justifyContent: "space-between",
      width: "95%",
      marginHorizontal: "auto",
      borderRadius: 10,
      marginBottom: 10,
    }),
    []
  );

  return (
    <View style={containerStyle}>
      {tags.map(({name, Icon}, index) => {
        const isActive = activePage === name;
        const iconColor = isActive ? themeColors.primary : themeColors.text;

        // Text width animation
        const textWidthAnim = useRef(
          new Animated.Value(isActive ? 1 : 0)
        ).current;

        if (isActive) {
          Animated.timing(textWidthAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }).start();
        } else {
          Animated.timing(textWidthAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false,
          }).start();
        }

        return (
          <Animated.View
            key={name}
            style={{
              transform: [{scale: scaleAnim}],
              opacity: opacityAnim,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handlePress(name, index)}
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: isActive ? "#1e1e1e" : "transparent",
              }}
            >
              <Icon size={24} color={iconColor} />
              <Animated.View
                style={{
                  width: textWidthAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 50], // Adjust based on your text width
                  }),
                  overflow: "hidden",
                }}
              >
                {isActive && (
                  <Text
                    style={{
                      color: iconColor,
                      fontWeight: "800",
                      width: 50, // Match the outputRange max value
                    }}
                  >
                    {name}
                  </Text>
                )}
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
};

export default React.memo(ToggleButton);
