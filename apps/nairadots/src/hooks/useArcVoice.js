import { useCallback, useEffect, useRef, useState } from 'react';
import { createArcVoiceSession } from '../services/arcChat.js';

const LIVE_SOCKET = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

function encodeBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return window.btoa(binary);
}

function decodeBase64(value) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function downsampleToPcm16(input, sourceRate, targetRate) {
  const ratio = sourceRate / targetRate;
  const output = new Int16Array(Math.floor(input.length / ratio));
  for (let index = 0; index < output.length; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(Math.floor((index + 1) * ratio), input.length);
    let total = 0;
    for (let sample = start; sample < end; sample += 1) total += input[sample];
    const value = end > start ? total / (end - start) : input[start] || 0;
    output[index] = Math.max(-1, Math.min(1, value)) * (value < 0 ? 0x8000 : 0x7fff);
  }
  return output;
}

function setupConfig(config) {
  const { responseModalities, speechConfig, ...sessionConfig } = config || {};
  return {
    ...sessionConfig,
    generationConfig: {
      responseModalities: responseModalities || ['AUDIO'],
      ...(speechConfig ? { speechConfig } : {}),
    },
  };
}

export function useArcVoice({ walletAddress, onAgentPrompt }) {
  const [status, setStatus] = useState('idle');
  const [phase, setPhase] = useState('listening');
  const [error, setError] = useState('');
  const [inputCaption, setInputCaption] = useState('');
  const [outputCaption, setOutputCaption] = useState('');
  const [muted, setMuted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const statusRef = useRef(status);
  const onAgentPromptRef = useRef(onAgentPrompt);
  const mutedRef = useRef(false);
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const gainRef = useRef(null);
  const playbackSourcesRef = useRef(new Set());
  const playbackTimeRef = useRef(0);
  const setupTimerRef = useRef(null);
  const durationTimerRef = useRef(null);
  const startingRef = useRef(false);
  const startOptionsRef = useRef(null);
  const generationRef = useRef(0);

  onAgentPromptRef.current = onAgentPrompt;
  statusRef.current = status;

  const stop = useCallback(() => {
    generationRef.current += 1;
    window.clearTimeout(setupTimerRef.current);
    window.clearInterval(durationTimerRef.current);
    setupTimerRef.current = null;
    durationTimerRef.current = null;
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      try { processorRef.current.disconnect(); } catch { }
    }
    if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch { } }
    if (gainRef.current) { try { gainRef.current.disconnect(); } catch { } }
    processorRef.current = null;
    sourceRef.current = null;
    gainRef.current = null;
    for (const source of playbackSourcesRef.current) {
      try { source.stop(); } catch { }
      try { source.disconnect(); } catch { }
    }
    playbackSourcesRef.current.clear();
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState < WebSocket.CLOSING) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      try { socket.close(1000, 'Call ended'); } catch { }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      const context = audioContextRef.current;
      audioContextRef.current = null;
      context.close().catch(() => { });
    }
    startingRef.current = false;
    mutedRef.current = false;
    setMuted(false);
    setStatus('idle');
    setPhase('listening');
    setElapsedSeconds(0);
  }, []);

  const fail = useCallback((message) => {
    setError(message);
    stop();
  }, [stop]);

  const playPcm = useCallback((base64Audio) => {
    const context = audioContextRef.current;
    if (!context || !base64Audio) return;
    const pcm = new Int16Array(decodeBase64(base64Audio).buffer);
    const buffer = context.createBuffer(1, pcm.length, OUTPUT_SAMPLE_RATE);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < pcm.length; index += 1) channel[index] = pcm[index] / 32768;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    const now = context.currentTime;
    playbackTimeRef.current = Math.max(playbackTimeRef.current, now + 0.02);
    source.start(playbackTimeRef.current);
    playbackTimeRef.current += buffer.duration;
    playbackSourcesRef.current.add(source);
    source.onended = () => {
      playbackSourcesRef.current.delete(source);
      try { source.disconnect(); } catch { }
    };
  }, []);

  const start = useCallback(async ({ conversationId, agentTag = 'arc' }) => {
    if (startingRef.current || status !== 'idle') return;
    if (!walletAddress) {
      setError('Sign in to start a voice call with your agent.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof WebSocket === 'undefined') {
      setError('Live voice needs a modern browser with microphone access.');
      return;
    }
    startingRef.current = true;
    const generation = ++generationRef.current;
    startOptionsRef.current = { conversationId, agentTag };
    setError('');
    setInputCaption('');
    setOutputCaption('');
    setStatus('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const audioContext = new window.AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
      audioContextRef.current = audioContext;
      await audioContext.resume();
      if (generation !== generationRef.current) return;
      const session = await createArcVoiceSession({ walletAddress, conversationId, agentTag });
      if (generation !== generationRef.current) return;
      if (!session?.token || !session?.model || !session?.config) throw new Error('Voice service returned an incomplete session.');

      const socket = new WebSocket(`${LIVE_SOCKET}?access_token=${encodeURIComponent(session.token)}`);
      socketRef.current = socket;
      const stopSetupTimer = () => {
        window.clearTimeout(setupTimerRef.current);
        setupTimerRef.current = null;
      };
      setupTimerRef.current = window.setTimeout(() => fail('The voice service took too long to connect. Please try again.'), 18000);

      socket.onopen = () => {
        socket.send(JSON.stringify({ setup: { model: `models/${session.model}`, ...setupConfig(session.config) } }));
      };
      socket.onerror = () => fail('The voice connection was interrupted. Check your connection and try again.');
      socket.onclose = (event) => {
        stopSetupTimer();
        if (socketRef.current === socket) {
          if (event.code !== 1000 && statusRef.current !== 'idle') setError('The voice connection ended. Please start another call.');
          stop();
        }
      };
      socket.onmessage = async (event) => {
        let message;
        try { message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text()); }
        catch { return; }
        if (message.setupComplete) {
          stopSetupTimer();
          const input = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          const mutedGain = audioContext.createGain();
          mutedGain.gain.value = 0;
          input.connect(processor);
          processor.connect(mutedGain);
          mutedGain.connect(audioContext.destination);
          processor.onaudioprocess = (audioEvent) => {
            if (mutedRef.current || socket.readyState !== WebSocket.OPEN) return;
            const pcm = downsampleToPcm16(audioEvent.inputBuffer.getChannelData(0), audioEvent.inputBuffer.sampleRate, INPUT_SAMPLE_RATE);
            if (!pcm.length) return;
            socket.send(JSON.stringify({ realtimeInput: { audio: { data: encodeBase64(new Uint8Array(pcm.buffer)), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` } } }));
          };
          sourceRef.current = input;
          processorRef.current = processor;
          gainRef.current = mutedGain;
          startingRef.current = false;
          setStatus('active');
          setPhase('listening');
          setElapsedSeconds(0);
          durationTimerRef.current = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
          return;
        }
        if (message.serverContent) {
          const content = message.serverContent;
          if (content.interrupted) {
            for (const source of playbackSourcesRef.current) { try { source.stop(); } catch { } }
            playbackSourcesRef.current.clear();
            playbackTimeRef.current = audioContext.currentTime;
          }
          if (content.inputTranscription?.text) {
            setOutputCaption('');
            setInputCaption(content.inputTranscription.text.trim());
          }
          if (content.interimInputTranscription?.text) {
            setOutputCaption('');
            setInputCaption(content.interimInputTranscription.text.trim());
          }
          if (content.outputTranscription?.text) {
            setOutputCaption(content.outputTranscription.text.trim());
            setPhase('speaking');
          }
          const parts = content.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith('audio/pcm')) {
              playPcm(part.inlineData.data);
              setPhase('speaking');
            }
          }
          if (content.turnComplete) {
            setPhase('listening');
          }
          if (content.waitingForInput) setPhase('listening');
        }
        if (message.toolCall?.functionCalls?.length) {
          setPhase('thinking');
          const functionResponses = await Promise.all(message.toolCall.functionCalls.map(async (call) => {
            if (call.name !== 'ask_nairatag_agent') {
              return { id: call.id, name: call.name, response: { error: 'Unsupported agent action.' } };
            }
            const request = String(call.args?.request || '').trim().slice(0, 8000);
            if (!request) return { id: call.id, name: call.name, response: { error: 'I did not catch a request. Please say it again.' } };
            setInputCaption(request);
            try {
              const result = await onAgentPromptRef.current?.(request);
              return { id: call.id, name: call.name, response: { result: String(result?.reply || result || 'Your agent did not return a response.') } };
            } catch (toolError) {
              return { id: call.id, name: call.name, response: { error: String(toolError?.message || 'Your agent could not complete that request.') } };
            }
          }));
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ toolResponse: { functionResponses } }));
          setPhase('speaking');
        }
        if (message.toolCallCancellation) setPhase('listening');
        if (message.goAway) fail('This voice session is ending. Please start another call.');
      };
    } catch (voiceError) {
      const message = voiceError?.name === 'NotAllowedError'
        ? 'Allow microphone access in your browser to use voice.'
        : voiceError?.name === 'NotFoundError'
          ? 'No microphone was found on this device.'
          : (voiceError?.message || 'Could not start live voice. Please try again.');
      setError(message);
      stop();
    }
  }, [fail, playPcm, status, stop, walletAddress]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
  }, []);

  const retry = useCallback(() => {
    if (startOptionsRef.current) start(startOptionsRef.current);
  }, [start]);

  useEffect(() => () => stop(), [stop]);

  return { status, phase, error, inputCaption, outputCaption, muted, elapsedSeconds, start, retry, stop, toggleMute, clearError: () => setError('') };
}
