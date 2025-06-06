import {Text, View} from "react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text className="text-2xl text-black-700 w-3/4 text-center">
        All coding and routing starts from here 😊
      </Text>
    </View>
  );
}
