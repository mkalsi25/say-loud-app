import { Button, Host, TextField, VStack } from "@expo/ui/swift-ui";
import {
  cornerRadius,
  font,
  frame,
  glassEffect,
  multilineTextAlignment,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import {
  AudioModule,
  RecordingPresets,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { MeshGradientView } from "expo-mesh-gradient";
import * as Speech from "expo-speech";
import {
  AudioEncodingAndroid,
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

type TranscribeState = "idle" | "transcribing" | "done" | "error";

export default function HomeScreen() {
  const [text, setText] = useState("");
  const [speaking, setSpeaking] = useState(false);

  // ── Recording ────────────────────────────────────────────────────────────
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  // ── Playback ─────────────────────────────────────────────────────────────
  const player = useAudioPlayer(recordingUri ? { uri: recordingUri } : null);
  const [playing, setPlaying] = useState(false);
  const playerSub = useRef<ReturnType<typeof player.addListener> | null>(null);

  // ── Transcription ────────────────────────────────────────────────────────
  const [transcribeState, setTranscribeState] =
    useState<TranscribeState>("idle");
  const transcriptAccum = useRef(""); // accumulate interim + final results

  // Request mic permission on mount
  useEffect(() => {
    AudioModule.requestRecordingPermissionsAsync();
  }, []);

  // Listen for STT results (interim + final)
  useSpeechRecognitionEvent("result", (e) => {
    const transcript = e.results[0]?.transcript ?? "";
    transcriptAccum.current = transcript;
    // Show live interim results in the text field
    if (!e.isFinal) setText(transcript);
  });

  useSpeechRecognitionEvent("end", () => {
    setText(transcriptAccum.current);
    setTranscribeState("done");
  });

  useSpeechRecognitionEvent("error", (e) => {
    console.warn("STT error:", e.error, e.message);
    setTranscribeState("error");
  });

  // ── TTS ──────────────────────────────────────────────────────────────────
  const handleSpeak = () => {
    if (!text.trim()) return;
    setSpeaking(true);
    Speech.speak(text, {
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
    });
  };

  const handleStopSpeak = () => {
    Speech.stop();
    setSpeaking(false);
  };

  // ── Recording ────────────────────────────────────────────────────────────
  const handleRecord = async () => {
    setRecordingUri(null);
    setTranscribeState("idle");
    setText("");
    transcriptAccum.current = "";
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const handleStopRecording = async () => {
    await recorder.stop();
    const uri = recorder.uri;
    if (uri) setRecordingUri(uri);
  };

  // ── Playback ─────────────────────────────────────────────────────────────
  const handlePlay = () => {
    if (!recordingUri) return;
    playerSub.current?.remove();
    playerSub.current = player.addListener("playbackStatusUpdate", (s) => {
      if (s.didJustFinish) {
        setPlaying(false);
        playerSub.current?.remove();
      }
    });
    player.seekTo(0);
    player.play();
    setPlaying(true);
  };

  const handleStopPlay = () => {
    player.pause();
    setPlaying(false);
  };

  // ── Transcription ────────────────────────────────────────────────────────
  const handleTranscribe = () => {
    if (!recordingUri) return;
    setTranscribeState("transcribing");
    setText("");
    transcriptAccum.current = "";

    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      requiresOnDeviceRecognition: Platform.OS === "ios",
      audioSource: {
        uri: recordingUri,
        audioChannels: 1,
        audioEncoding: AudioEncodingAndroid.ENCODING_PCM_16BIT,
        sampleRate: 16000,
      },
    });
  };

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const hasRecording = !!recordingUri && !recorderState.isRecording;

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
          {/* ── Text input ── */}
          <TextField
            placeholder={
              transcribeState === "transcribing"
                ? "Transcribing…"
                : "Type or record something…"
            }
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

          {/* ── TTS ── */}
          <Button
            label={speaking ? "Stop" : "Speak"}
            onPress={speaking ? handleStopSpeak : handleSpeak}
            modifiers={[
              padding({ horizontal: 32, vertical: 14 }),
              glassEffect({
                glass: { variant: speaking ? "identity" : "regular" },
              }),
              cornerRadius(50),
            ]}
          />

          {/* ── Record ── */}
          <Button
            label={recorderState.isRecording ? "Stop Recording" : "Record"}
            onPress={
              recorderState.isRecording ? handleStopRecording : handleRecord
            }
            modifiers={[
              padding({ horizontal: 32, vertical: 14 }),
              glassEffect({
                glass: {
                  variant: recorderState.isRecording ? "identity" : "regular",
                },
              }),
              cornerRadius(50),
            ]}
          />

          {/* ── Live timer ── */}
          {recorderState.isRecording && (
            <Text style={styles.timer}>
              🔴 {fmt(recorderState.durationMillis)}
            </Text>
          )}

          {/* ── Play + Transcribe — shown after recording ── */}
          {hasRecording && (
            <>
              <Button
                label={playing ? "Stop Playback" : "Play Recording"}
                onPress={playing ? handleStopPlay : handlePlay}
                modifiers={[
                  padding({ horizontal: 32, vertical: 14 }),
                  glassEffect({
                    glass: { variant: playing ? "identity" : "regular" },
                  }),
                  cornerRadius(50),
                ]}
              />

              {transcribeState !== "transcribing" ? (
                <Button
                  label="Transcribe Recording"
                  onPress={handleTranscribe}
                  modifiers={[
                    padding({ horizontal: 32, vertical: 14 }),
                    glassEffect({ glass: { variant: "regular" } }),
                    cornerRadius(50),
                  ]}
                />
              ) : (
                <View style={styles.transcribingRow}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.timer}> Transcribing…</Text>
                </View>
              )}
            </>
          )}
        </VStack>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  host: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  timer: {
    textAlign: "center",
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
    letterSpacing: 1,
  },
  transcribingRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});
