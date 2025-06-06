import {GluestackUIProvider} from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
import {Stack} from "expo-router";

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="light">
      <Stack initialRouteName="index">
        <Stack.Screen name="index" options={{headerShown: false}} />
      </Stack>
    </GluestackUIProvider>
  );
}
