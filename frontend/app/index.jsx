import {Redirect} from "expo-router";
import {useEffect, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {View, ActivityIndicator} from "react-native";
import * as MediaLibrary from "expo-media-library";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const value = await AsyncStorage.getItem("@onboarding_complete");
      setHasCompletedOnboarding(value === "true");
      
      // Request media permissions on app startup if onboarding is complete
      if (value === "true") {
        console.log('Requesting media permissions on app startup...');
        try {
          const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
          console.log('Media permission status:', { status, canAskAgain });
        } catch (error) {
          console.error('Error requesting media permissions:', error);
        }
      }
    } catch (err) {
      console.log("Error checking onboarding status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#121212",
        }}
      >
        <ActivityIndicator size="large" color="#FF00FF" />
      </View>
    );
  }

  return (
    <Redirect
      href={hasCompletedOnboarding ? "/(tabs)/(video)" : "/(onboarding)"}
    />
  );
}

/* import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  useEffect(() => {
    checkIfFirstLaunch();
  }, []);

  const checkIfFirstLaunch = async () => {
    try {
      // Check if the app has been launched before
      const hasLaunched = await AsyncStorage.getItem('@has_launched');
      
      if (hasLaunched === null) {
        // First time launching - show onboarding
        await AsyncStorage.setItem('@has_launched', 'true');
        setIsFirstLaunch(true);
      } else {
        // Not first launch - skip onboarding
        setIsFirstLaunch(false);
      }
    } catch (err) {
      console.log('Error checking first launch:', err);
      // If there's an error, default to not showing onboarding
      setIsFirstLaunch(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#FF00FF" />
      </View>
    );
  }

  return <Redirect href={isFirstLaunch ? "/onboarding" : "/(tabs)"} />;
} */
