import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../services/api';
import Layout from '../components/Layout';
import { Camera, Scan, CheckCircle, XCircle } from 'lucide-react';

const ZONES = ['Entrance', 'Main Hall', 'Food Court'];

const QRScanner = () => {
  const [selectedZone, setSelectedZone] = useState('Entrance');
  const [scanResult, setScanResult] = useState(null); 
  const [loading, setLoading] = useState(false);

  const playSound = (isSuccess) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (isSuccess) {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); 
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); 
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.error('Failed to play synthesizer sound', e);
    }
  };

  const handleScanSuccess = async (decodedText) => {
    if (scanResult || loading) return;

    try {
      setLoading(true);
      const res = await api.post('/checkin/scan', {
        qrToken: decodedText.trim(),
        zone: selectedZone
      });

      const { attendee, eventTitle } = res.data.data;
      playSound(true);
      setScanResult({
        success: true,
        message: `Welcome, ${attendee.name}!`,
        subMessage: `Checked in to ${selectedZone} for: "${eventTitle}"`
      });
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Check-in failed';
      playSound(false);
      setScanResult({
        success: false,
        message: 'Scan Invalid',
        subMessage: errMsg
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader-container',
      {
        fps: 8,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        aspectRatio: 1.0
      },
      false
    );

    scanner.render(
      (text) => handleScanSuccess(text),
      (err) => {}
    );

    return () => {
      scanner.clear().catch((error) => {
        console.error('Failed to clear QR Scanner', error);
      });
    };
  }, [selectedZone, scanResult]); 

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-[#7C5CFC]/10 p-3 rounded-2xl text-[#C9FF3D] border border-[#7C5CFC]/20">
            <Scan className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#F3F1F8]">Organizer Check-In Station</h1>
          <p className="text-xs text-[#8A8797] max-w-sm">
            Configure the check-in checkpoint zone and scan attendee ticket QR codes.
          </p>
        </div>

        {/* Checkpoint zone selector */}
        <div className="bg-[#13131F] border border-[#232236] rounded-2xl p-5 shadow-sm space-y-3">
          <label className="block text-xs font-bold text-[#8A8797] uppercase tracking-wider">
            Check-In checkpoint zone
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ZONES.map((zone) => (
              <button
                key={zone}
                type="button"
                onClick={() => setSelectedZone(zone)}
                className={`py-2.5 px-3 border rounded-xl text-xs font-bold text-center transition-all cursor-none ${
                  selectedZone === zone
                    ? 'bg-[#7C5CFC] text-white border-transparent shadow-sm'
                    : 'bg-[#0A0A12] text-[#8A8797] border-[#232236] hover:bg-[#13131F]'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>
        </div>

        {/* Scanner Body */}
        <div className="relative bg-[#13131F] border border-[#232236] rounded-3xl p-6 shadow-sm overflow-hidden min-h-[350px] flex flex-col justify-center">
          <div className={`${scanResult ? 'hidden' : 'block'} space-y-4`}>
            <div id="qr-reader-container" className="rounded-2xl overflow-hidden mx-auto max-w-sm border border-[#232236] bg-[#0A0A12]" />
            <div className="flex items-center justify-center space-x-2 text-xs text-[#8A8797] font-medium">
              <Camera className="w-4 h-4" />
              <span>Camera feed automatically initializes. Keep ticket within target grid.</span>
            </div>
          </div>

          {/* Success Overlay */}
          {scanResult && scanResult.success && (
            <div className="absolute inset-0 bg-[#27AE60] text-white p-8 flex flex-col justify-center items-center text-center animate-fadeIn z-20">
              <CheckCircle className="w-24 h-24 mb-4 animate-scaleUp" />
              <h2 className="text-4xl font-black tracking-tight">{scanResult.message}</h2>
              <p className="text-sm font-semibold mt-4 bg-white/20 px-4 py-2 rounded-xl border border-white/10 max-w-md">
                {scanResult.subMessage}
              </p>
              <button
                onClick={() => setScanResult(null)}
                className="mt-8 px-8 py-3 bg-white text-[#27AE60] font-extrabold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-md active:scale-95 cursor-none"
              >
                Scan Next Ticket
              </button>
            </div>
          )}

          {/* Error Overlay */}
          {scanResult && !scanResult.success && (
            <div className="absolute inset-0 bg-[#FF5C7A] text-white p-8 flex flex-col justify-center items-center text-center animate-fadeIn z-20">
              <XCircle className="w-24 h-24 mb-4 animate-scaleUp" />
              <h2 className="text-4xl font-black tracking-tight">{scanResult.message}</h2>
              <p className="text-sm font-semibold mt-4 bg-white/20 px-4 py-2 rounded-xl border border-white/10 max-w-md">
                {scanResult.subMessage}
              </p>
              <button
                onClick={() => setScanResult(null)}
                className="mt-8 px-8 py-3 bg-white text-[#FF5C7A] font-extrabold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-md active:scale-95 cursor-none"
              >
                Reset Scanner
              </button>
            </div>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-[#0A0A12]/90 backdrop-blur-sm flex flex-col justify-center items-center text-center z-10">
              <div className="w-12 h-12 border-4 border-[#7C5CFC] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-[#F3F1F8] mt-3">Validating registration token...</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default QRScanner;
