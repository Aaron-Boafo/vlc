import React, {useState, useRef, useEffect} from "react";
import {
  View,
  Text,
  Dimensions,
  Pressable,
  Animated,
  StyleSheet,
  Easing,
  StatusBar,
  Alert,
  Linking,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {useRouter} from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {LinearGradient} from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import {
  Music,
  Play,
  Folder,
  Settings,
} from "lucide-react-native";
import useThemeStore from "../../store/theme";
import Paginator from "../../components/Paginator";

const {width, height} = Dimensions.get("window");

const onboardingData = [
  {
    title: "Welcome to Visura",
    subtitle: "Next Generation Media Player",
    description: "Experience your entertainment in a whole new way",
    icon: "play",
    gradient: ["#8B5CF6", "#A855F7", "#EC4899"], // Added pink for more vibrant gradient
    pattern: "diagonal",
  },
  {
    title: "Smart Library",
    subtitle: "Intelligent Organization",
    description:
      "Your media, automatically categorized and beautifully presented",
    icon: "media",
    gradient: ["#8B5CF6", "#9333EA", "#7C3AED"], // Enhanced purple gradient
    pattern: "grid",
  },
  {
    title: "Universal Player",
    subtitle: "Play Everything",
    description: "Any format, any device, anytime - without limits",
    icon: "folder",
    gradient: ["#A855F7", "#8B5CF6", "#06B6D4"], // Added cyan for dynamic effect
    pattern: "circles",
  },
  {
    title: "Ready to Begin",
    subtitle: "Your Journey Starts Now",
    description: "Dive into a world of unlimited entertainment",
    icon: "complete",
    gradient: ["#9333EA", "#8B5CF6", "#10B981"], // Added green for completion feel
    pattern: "waves",
  },
];

const AnimatedIcon = ({icon, size, isActive}) => {
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.elastic(1),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const renderIcon = () => {
    switch (icon) {
      case "play":
        return <Play size={size} color="#FFF" />;
      case "media":
        return <Music size={size} color="#FFF" />;
      case "folder":
        return <Folder size={size} color="#FFF" />;
      case "complete":
        return <Settings size={size} color="#FFF" />;
      default:
        return null;
    }
  };

  return (
    <Animated.View
      style={[
        styles.iconWrapper,
        {
          transform: [
            {scale: scaleAnim}, 
            {rotate: rotate}
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      {renderIcon()}
    </Animated.View>
  );
};

const BackgroundPattern = ({pattern, colors}) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 15000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 15000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.1],
  });

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height * 0.1],
  });

  return (
    <Animated.View
      style={[
        styles.pattern,
        {
          transform: [{translateX}, {translateY}],
        },
      ]}
    >
      <LinearGradient
        colors={colors}
        style={[
          styles.patternGradient,
          pattern === "diagonal" && styles.diagonalPattern,
          pattern === "grid" && styles.gridPattern,
          pattern === "circles" && styles.circlesPattern,
          pattern === "waves" && styles.wavesPattern,
        ]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      />
    </Animated.View>
  );
};

const OnboardingScreen = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const router = useRouter();
    const scrollX = useRef(new Animated.Value(0)).current;
    const slideRef = useRef(null);
    const { themeColors } = useThemeStore();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkOnboardingStatus = async () => {
            try {
                // Remove the force-reset for production
                // await AsyncStorage.removeItem('hasOnboarded');
                const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
                if (hasOnboarded) {
                    router.replace('/(tabs)/');
                }
            } catch (error) {
                console.error('Error checking onboarding status:', error);
            } finally {
                setIsChecking(false);
            }
        };
        checkOnboardingStatus();
    }, []);

    const viewableItemsChanged = useRef(({viewableItems}) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({viewAreaCoveragePercentThreshold: 50}).current;

    const handleNext = () => {
        console.log('handleNext called, currentIndex:', currentIndex);
        if (currentIndex < onboardingData.length - 1) {
            try {
                const nextIndex = currentIndex + 1;
                console.log('Scrolling to index:', nextIndex);
                
                // Try scrollToIndex first
                slideRef.current?.scrollToIndex({
                    index: nextIndex,
                    animated: true
                });
                
                // Fallback: use scrollTo if scrollToIndex doesn't work
                setTimeout(() => {
                    if (slideRef.current) {
                        slideRef.current.scrollTo({
                            x: width * nextIndex,
                            animated: true
                        });
                    }
                }, 100);
                
            } catch (error) {
                console.error('Error in handleNext:', error);
                // Final fallback: use scrollTo
                if (slideRef.current) {
                    slideRef.current.scrollTo({
                        x: width * (currentIndex + 1),
                        animated: true
                    });
                }
            }
        }
    };

    const handleDone = async () => {
        try {
            await AsyncStorage.setItem('hasOnboarded', 'true');
            router.replace("/(tabs)");
        } catch (err) {
            console.log("Error saving onboarding status:", err);
        }
    };

    const requestPermissionsAndFinish = async () => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'This app needs access to your media library to show your videos and music. You can enable this in your device settings.',
                    [
                        { text: 'Continue Anyway', onPress: () => handleDone() },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
            } else {
                handleDone();
            }
        } catch (error) {
            console.error('Error requesting permissions:', error);
            handleDone();
        }
    }

    const skip = () => {
        requestPermissionsAndFinish();
    };

    const handleMainButtonPress = () => {
        console.log('Main button pressed, currentIndex:', currentIndex, 'total:', onboardingData.length);
        if (currentIndex === onboardingData.length - 1) {
            console.log('Last slide, finishing onboarding');
            requestPermissionsAndFinish();
        } else {
            console.log('Not last slide, calling handleNext');
            handleNext();
        }
    };

    if (isChecking) {
        return (
            <View style={[styles.container, {justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background}]}>
              <StatusBar hidden />
              <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
        )
    }

    return (
        <>
            <StatusBar
              barStyle="light-content"
              backgroundColor="transparent"
              translucent
            />
            <View style={[styles.container, {backgroundColor: themeColors.background}]}>
                {/* Subtle gradient overlay for the entire background */}
                <LinearGradient
                    colors={['rgba(139, 92, 246, 0.05)', 'transparent', 'rgba(139, 92, 246, 0.08)']}
                    style={styles.backgroundOverlay}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                />
                <Animated.FlatList
                    ref={slideRef}
                    data={onboardingData}
                    getItemLayout={(data, index) => ({
                        length: width,
                        offset: width * index,
                        index,
                    })}
                    renderItem={({item, index}) => (
                        <View style={styles.slide}>
                            <BackgroundPattern pattern={item.pattern} colors={item.gradient} />
                            <View style={styles.contentContainer}>
                                <AnimatedIcon icon={item.icon} size={80} isActive={index === currentIndex} />
                                <View style={styles.textContainer}>
                                    <Text style={[styles.subtitle, { color: themeColors.primary }]}>{item.subtitle}</Text>
                                    <Text style={[styles.title, { color: themeColors.text }]} weight="Bold">{item.title}</Text>
                                    <Text style={[styles.description, { color: themeColors.textSecondary }]}>{item.description}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    bounces={false}
                    keyExtractor={(item) => item.title}
                    onScroll={Animated.event(
                        [{nativeEvent: {contentOffset: {x: scrollX}}}],
                        {useNativeDriver: false}
                    )}
                    scrollEventThrottle={32}
                    onViewableItemsChanged={viewableItemsChanged}
                    viewabilityConfig={viewConfig}
                />

                <View style={[styles.bottomContainer, { zIndex: 100 }]}>
                    <Paginator data={onboardingData} scrollX={scrollX} />
                    <View style={[styles.buttonContainer, { zIndex: 101 }]}>
                        <Pressable 
                            style={[styles.button, styles.skipButton, { zIndex: 1000 }]} 
                            onPress={() => {
                                console.log('Skip button pressed');
                                skip();
                            }}
                        >
                            <LinearGradient
                                colors={['rgba(139, 92, 246, 0.1)', 'rgba(139, 92, 246, 0.05)']}
                                style={styles.skipButtonGradient}
                                start={{x: 0, y: 0}}
                                end={{x: 1, y: 1}}
                            >
                                <Text style={[styles.buttonText, {color: themeColors.text}]} weight="Bold">Skip</Text>
                            </LinearGradient>
                        </Pressable>
                        <TouchableOpacity
                            onPress={handleMainButtonPress}
                            onPressIn={() => console.log('Button pressed in')}
                            onPressOut={() => console.log('Button pressed out')}
                            activeOpacity={0.8}
                            style={{ zIndex: 1000 }} // Ensure button is on top
                        >
                            <LinearGradient
                                colors={['#8B5CF6', '#A855F7', '#EC4899']} // More vibrant gradient
                                start={{x: 0, y: 0}}
                                end={{x: 1, y: 1}}
                                style={[styles.button, styles.gradientButton]}
                            >
                                <Text style={[styles.buttonText, {color: '#FFFFFF'}]} weight="Bold">{currentIndex === onboardingData.length - 1 ? "Get Started" : "Next"}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor will be set dynamically using themeColors.background
  },
  slide: {
    width,
    height,
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 2,
  },
  pattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4, // Increased from 0.15 to make gradients more visible
  },
  patternGradient: {
    width: width * 2,
    height: height * 2,
    position: "absolute",
  },
  diagonalPattern: {
    transform: [{rotate: "45deg"}],
  },
  gridPattern: {
    transform: [{scale: 0.5}],
  },
  circlesPattern: {
    borderRadius: width,
  },
  wavesPattern: {
    transform: [{rotate: "30deg"}],
  },
  iconWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(139, 92, 246, 0.3)", // Increased opacity
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    borderWidth: 3, // Thicker border
    borderColor: "rgba(139, 92, 246, 0.6)", // More visible border
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8, // Android shadow
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    // color will be set dynamically using themeColors.text
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    // color will be set dynamically using themeColors.textSecondary
    textAlign: "center",
    lineHeight: 24,
    maxWidth: "80%",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    minWidth: 140,
    alignItems: "center",
  },
  skipButton: {
    overflow: 'hidden', // For gradient border radius
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  skipButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    // color will be set dynamically
    fontSize: 16,
    fontWeight: "600",
    textAlign: 'center'
  },
  gradientButton: {
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6, // Android shadow
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});

export default OnboardingScreen;
