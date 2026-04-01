import { Button, Host, TextField, VStack } from "@expo/ui/swift-ui";
import {
  cornerRadius,
  font,
  frame,
  glassEffect,
  multilineTextAlignment,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { MeshGradientView } from "expo-mesh-gradient";
import * as Speech from "expo-speech";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

export default function HomeScreen() {
  const [text, setText] = useState("");
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = () => {
    if (!text.trim()) return;
    setSpeaking(true);
    Speech.speak(text, {
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
    });
  };

  const handleStop = () => {
    Speech.stop();
    setSpeaking(false);
  };

  return (
    <View style={styles.container}>
      <MeshGradientView
        style={StyleSheet.absoluteFill}
        columns={3}
        rows={3}
        colors={[
          "#a18cd1",
          "#fbc2eb",
          "#a1c4fd",
          "#c2e9fb",
          "#ffecd2",
          "#fcb69f",
          "#ff9a9e",
          "#fad0c4",
          "#a18cd1",
        ]}
        points={[
          [0.0, 0.0],
          [0.5, 0.0],
          [1.0, 0.0],
          [0.0, 0.5],
          [0.5, 0.5],
          [1.0, 0.5],
          [0.0, 1.0],
          [0.5, 1.0],
          [1.0, 1.0],
        ]}
      />

      <Host style={styles.host}>
        <VStack spacing={20} modifiers={[padding({ horizontal: 10 })]}>
          {/* Input card */}
          <TextField
            placeholder="Type something to speak..."
            multiline
            defaultValue={text}
            onChangeText={setText}
            modifiers={[
              font({ size: 40, weight: "bold" }),
              multilineTextAlignment("center"),
              frame({ minHeight: 100 }),
              padding({ all: 16 }),
              glassEffect({ glass: { variant: "regular" } }),
            ]}
          />

          <Button
            label={speaking ? "Stop" : "Speak"}
            onPress={speaking ? handleStop : handleSpeak}
            modifiers={[
              padding({ horizontal: 32, vertical: 14 }),
              glassEffect({
                glass: { variant: speaking ? "identity" : "regular" },
              }),
              cornerRadius(50),
            ]}
          />
        </VStack>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  host: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
});
