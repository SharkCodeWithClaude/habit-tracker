"use client";

import { useRef, useState } from "react";

export interface VoiceRecorder {
  recording: boolean;
  interim: string;
  start: () => void;
  stop: () => void;
}

/** Web Speech API wrapper. Chrome/Safari only — degrades silently elsewhere. */
export function useVoiceRecorder(onFinal: (text: string) => void): VoiceRecorder {
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const recogRef = useRef<any>(null);

  const start = () => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice not supported in this browser. Try Chrome.");
      return;
    }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    let finalText = "";
    r.onresult = (e: any) => {
      let interimTxt = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interimTxt += t;
      }
      setInterim(interimTxt);
      if (finalText.trim()) {
        onFinal(finalText.trim());
        finalText = "";
      }
    };
    r.onend = () => {
      setRecording(false);
      setInterim("");
    };
    r.onerror = () => {
      setRecording(false);
      setInterim("");
    };
    r.start();
    recogRef.current = r;
    setRecording(true);
  };

  const stop = () => {
    try {
      recogRef.current?.stop();
    } catch {}
    setRecording(false);
  };

  return { recording, interim, start, stop };
}
