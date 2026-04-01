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
  const [permissionGranted, setPermissionGranted] = useState(false);

  // ── Recording ────────────────────────────────────────────────────────────
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 500); // poll every 500ms for UI updates
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  // ── Playback ─────────────────────────────────────────────────────────────
  const player = useAudioPlayer(recordingUri ? { uri: recordingUri } : null);
  const [playing, setPlaying] = useState(false);

  // ── Transcription ────────────────────────────────────────────────────────
  const [transcribeState, setTranscribeState] =
    useState<TranscribeState>("idle");
  const transcriptAccum = useRef("");

  // ── Request permissions on mount ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      setPermissionGranted(granted);
      if (!granted) {
        console.warn("Microphone permission not granted");
      }
    })();
  }, []);

  // ── Reload player when recordingUri changes ──────────────────────────────
  useEffect(() => {
    if (recordingUri && player) {
      player.replace({ uri: recordingUri });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingUri]);

  // ── Track playback status to detect end ──────────────────────────────────
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener("playbackStatusUpdate", (status) => {
      // In expo-audio, check if playback has finished
      if (playing && !status.playing && status.currentTime >= status.duration) {
        setPlaying(false);
      }
    });
    return () => sub.remove();
  }, [player, playing]);

  // ── Listen for STT results (interim + final) ────────────────────────────
  useSpeechRecognitionEvent("result", (e) => {
    const transcript = e.results[0]?.transcript ?? "";
    transcriptAccum.current = transcript;
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
    if (!permissionGranted) {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        console.warn("Microphone permission denied");
        return;
      }
      setPermissionGranted(true);
    }

    setRecordingUri(null);
    setTranscribeState("idle");
    setText("");
    transcriptAccum.current = "";

    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const handleStopRecording = async () => {
    try {
      await recorder.stop();
      // Give a small delay for the URI to be available
      const uri = recorder.uri;
      if (uri) {
        setRecordingUri(uri);
      } else {
        console.warn("No recording URI available after stop");
      }
    } catch (err) {
      console.error("Failed to stop recording:", err);
    }
  };

  // ── Playback ─────────────────────────────────────────────────────────────
  const handlePlay = () => {
    if (!recordingUri || !player) return;
    player.seekTo(0);
    player.play();
    setPlaying(true);
  };

  const handleStopPlay = () => {
    if (player) player.pause();
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

  const isRecording = recorderState.isRecording;
  const hasRecording = !!recordingUri && !isRecording;

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

          {/* ── Permission warning ── */}
          {!permissionGranted && (
            <Text style={styles.warning}>⚠ Microphone permission required</Text>
          )}

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
            label={isRecording ? "⏹ Stop Recording" : "🎙 Record"}
            onPress={isRecording ? handleStopRecording : handleRecord}
            modifiers={[
              padding({ horizontal: 32, vertical: 14 }),
              glassEffect({
                glass: {
                  variant: isRecording ? "identity" : "regular",
                },
              }),
              cornerRadius(50),
            ]}
          />

          {/* ── Live timer ── */}
          {isRecording && (
            <Text style={styles.timer}>
              🔴 Recording {fmt(recorderState.durationMillis)}
            </Text>
          )}

          {/* ── Play + Transcribe — shown after recording ── */}
          {hasRecording && (
            <>
              <Button
                label={playing ? "⏹ Stop Playback" : "▶ Play Recording"}
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
                  label="📝 Transcribe Recording"
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

              {transcribeState === "error" && (
                <Text style={styles.errorText}>
                  Transcription failed. Try again.
                </Text>
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
  warning: {
    textAlign: "center",
    fontSize: 14,
    color: "#ffcc00",
    fontWeight: "500",
  },
  errorText: {
    textAlign: "center",
    fontSize: 14,
    color: "#ff6b6b",
    fontWeight: "500",
  },
});
