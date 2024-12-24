import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text className="font-bold text-3xl my-10 text-red-500 font-rubik">
        Welcome to Restate
      </Text>
      <Link href={"/sign-in"}>Signin</Link>
      <Link href={"/explore"}>Explore</Link>
      <Link href={"/profile"}>Profile</Link>
      <Link href={"/properties/[id]"}>Property</Link>
    </View>
  );
}
