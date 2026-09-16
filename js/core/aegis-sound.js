/**
 * Optional UI-feedback architecture. Muted by default. No audio assets.
 * Future sounds must stay short, optional, and non-blocking.
 */
(function (global) {
    'use strict';

    var STORAGE_KEY = 'aegisdesk_sound_enabled';
    var ctx = null;

    function isEnabled() {
        try {
            return localStorage.getItem(STORAGE_KEY) === '1';
        } catch (e) {
            return false;
        }
    }

    function setEnabled(on) {
        try {
            localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
        } catch (e) { /* ignore */ }
    }

    function context() {
        if (ctx) return ctx;
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        return ctx;
    }

    function play(kind) {
        if (!isEnabled()) return;
        if (document.documentElement.classList.contains('aegis-reduced-motion')) return;
        var audio = context();
        if (!audio) return;
        if (audio.state === 'suspended') {
            audio.resume().catch(function () { /* autoplay lock */ });
        }
        var now = audio.currentTime;
        var osc = audio.createOscillator();
        var gain = audio.createGain();
        var freq = kind === 'error' ? 240 : kind === 'success' ? 520 : 380;
        var dur = 0.07;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.04, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(now);
        osc.stop(now + dur + 0.02);
    }

    global.aegisSound = {
        isEnabled: isEnabled,
        setEnabled: setEnabled,
        play: play
    };
})(typeof window !== 'undefined' ? window : this);
