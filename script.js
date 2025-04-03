document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const synth = window.speechSynthesis;
    const themeToggle = document.getElementById('themeToggle');
    const textInput = document.getElementById('textInput');
    const clearTextBtn = document.getElementById('clearText');
    const voiceSelect = document.getElementById('voiceSelect');
    const languageSelect = document.getElementById('languageSelect');
    const rateSlider = document.getElementById('rateSlider');
    const pitchSlider = document.getElementById('pitchSlider');
    const volumeSlider = document.getElementById('volumeSlider');
    const rateValue = document.getElementById('rateValue');
    const pitchValue = document.getElementById('pitchValue');
    const volumeValue = document.getElementById('volumeValue');
    const speakButton = document.getElementById('speakButton');
    const pauseButton = document.getElementById('pauseButton');
    const resumeButton = document.getElementById('resumeButton');
    const stopButton = document.getElementById('stopButton');
    const currentVoice = document.getElementById('currentVoice');
    const status = document.getElementById('status');
    const charCount = document.getElementById('charCount');
    const wordCount = document.getElementById('wordCount');
    const durationEstimate = document.getElementById('durationEstimate');
    const voiceStatus = document.getElementById('voiceStatus');

    // State variables
    let voices = [];
    let utterance = null;
    let isSpeaking = false;
    let isPaused = false;
    let darkMode = false;

    // Initialize the application
    function init() {
        setupEventListeners();
        loadVoices();
        checkDarkModePreference();
        updateCharacterCount();
    }

    // Dark mode toggle
    function checkDarkModePreference() {
        darkMode = localStorage.getItem('darkMode') === 'true' || 
                  (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        if (darkMode) {
            document.body.classList.add('dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    function toggleDarkMode() {
        darkMode = !darkMode;
        document.body.classList.toggle('dark');
        localStorage.setItem('darkMode', darkMode);
        themeToggle.innerHTML = darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }

    // Update character and word count
    function updateCharacterCount() {
        const text = textInput.value;
        charCount.textContent = `${text.length} character${text.length !== 1 ? 's' : ''}`;
        
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        wordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
        
        // Estimate duration (average 150 words per minute)
        if (words > 0) {
            const minutes = Math.floor(words / 150);
            const seconds = Math.round((words % 150) / 150 * 60);
            
            if (minutes > 0) {
                durationEstimate.textContent = `${minutes}m ${seconds}s`;
            } else {
                durationEstimate.textContent = `${seconds}s`;
            }
        } else {
            durationEstimate.textContent = '-';
        }
    }

    // Set up event listeners
    function setupEventListeners() {
        // Theme toggle
        themeToggle.addEventListener('click', toggleDarkMode);
        
        // Text input events
        textInput.addEventListener('input', updateCharacterCount);
        
        // Clear text button
        clearTextBtn.addEventListener('click', () => {
            textInput.value = '';
            updateCharacterCount();
        });
        
        // Range input events
        rateSlider.addEventListener('input', () => {
            rateValue.textContent = parseFloat(rateSlider.value).toFixed(1);
        });
        
        pitchSlider.addEventListener('input', () => {
            pitchValue.textContent = parseFloat(pitchSlider.value).toFixed(1);
        });
        
        volumeSlider.addEventListener('input', () => {
            volumeValue.textContent = parseFloat(volumeSlider.value).toFixed(1);
        });
        
        // Button events
        speakButton.addEventListener('click', speak);
        stopButton.addEventListener('click', stopSpeech);
        pauseButton.addEventListener('click', pauseSpeech);
        resumeButton.addEventListener('click', resumeSpeech);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+Enter to speak
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                speak();
            }
            
            // Escape to stop
            if (e.key === 'Escape' && isSpeaking) {
                e.preventDefault();
                stopSpeech();
            }
        });
        
        // Voice and language selection
        voiceSelect.addEventListener('change', updateCurrentVoiceDisplay);
        languageSelect.addEventListener('change', filterVoicesByLanguage);
    }

    // Load available voices
    function loadVoices() {
        voiceStatus.innerHTML = '<span class="loading"></span> Loading voices...';
        voices = synth.getVoices();
        
        // If voices aren't loaded yet, wait for the event
        if (voices.length === 0) {
            synth.onvoiceschanged = loadVoices;
            return;
        }
        
        // Populate voice select
        updateVoiceLists();
    }

    // Update both voice and language select lists
    function updateVoiceLists() {
        voiceSelect.innerHTML = '';
        languageSelect.innerHTML = '';
        
        // Group voices by language
        const languages = {};
        voices.forEach(voice => {
            if (!languages[voice.lang]) {
                languages[voice.lang] = [];
            }
            languages[voice.lang].push(voice);
        });
        
        // Populate language select
        for (const lang in languages) {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = `${lang} (${languages[lang].length} voices)`;
            languageSelect.appendChild(option);
        }
        
        // Set default language to browser language if available
        const browserLang = navigator.language;
        if (languages[browserLang]) {
            languageSelect.value = browserLang;
        } else {
            // Find closest match (e.g., 'en-US' vs 'en-GB')
            const baseLang = browserLang.split('-')[0];
            for (const lang in languages) {
                if (lang.startsWith(baseLang)) {
                    languageSelect.value = lang;
                    break;
                }
            }
        }
        
        // Filter voices by selected language
        filterVoicesByLanguage();
        voiceStatus.textContent = `${voices.length} voices available`;
    }

    // Filter voices by selected language
    function filterVoicesByLanguage() {
        const selectedLang = languageSelect.value;
        voiceSelect.innerHTML = '';
        
        if (!selectedLang) return;
        
        const filteredVoices = voices.filter(voice => voice.lang === selectedLang);
        
        if (filteredVoices.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'No voices for this language';
            option.disabled = true;
            voiceSelect.appendChild(option);
            return;
        }
        
        filteredVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' ★' : ''}`;
            option.dataset.voice = JSON.stringify({
                name: voice.name,
                lang: voice.lang,
                default: voice.default
            });
            voiceSelect.appendChild(option);
        });
        
        // Select default voice if available
        const defaultVoice = filteredVoices.find(voice => voice.default);
        if (defaultVoice) {
            voiceSelect.value = defaultVoice.name;
        }
        
        updateCurrentVoiceDisplay();
    }

    // Update current voice display
    function updateCurrentVoiceDisplay() {
        const selectedOption = voiceSelect.selectedOptions[0];
        if (selectedOption && selectedOption.dataset.voice) {
            const voice = JSON.parse(selectedOption.dataset.voice);
            currentVoice.textContent = `${voice.name} (${voice.lang})`;
            if (voice.default) {
                currentVoice.innerHTML += ' <span style="color: var(--accent)">★</span>';
            }
        }
    }

    // Speak function
    function speak() {
        if (synth.speaking) {
            synth.cancel();
        }
        
        const text = textInput.value.trim();
        if (text === '') {
            setStatus('Please enter some text', 'warning');
            textInput.focus();
            return;
        }
        
        utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice
        const selectedOption = voiceSelect.selectedOptions[0];
        if (selectedOption && selectedOption.dataset.voice) {
            const voiceData = JSON.parse(selectedOption.dataset.voice);
            const selectedVoice = voices.find(voice => 
                voice.name === voiceData.name && voice.lang === voiceData.lang
            );
            
            if (selectedVoice) {
                utterance.voice = selectedVoice;
                updateCurrentVoiceDisplay();
            }
        }
        
        // Set parameters
        utterance.rate = parseFloat(rateSlider.value);
        utterance.pitch = parseFloat(pitchSlider.value);
        utterance.volume = parseFloat(volumeSlider.value);
        
        // Event listeners
        utterance.onstart = () => {
            isSpeaking = true;
            isPaused = false;
            setStatus('Speaking...', 'active');
            updateButtonStates();
            speakButton.classList.add('speaking');
        };
        
        utterance.onend = () => {
            isSpeaking = false;
            isPaused = false;
            setStatus('Ready', '');
            updateButtonStates();
            speakButton.classList.remove('speaking');
        };
        
        utterance.onerror = (event) => {
            isSpeaking = false;
            isPaused = false;
            setStatus(`Error: ${event.error}`, 'warning');
            updateButtonStates();
            speakButton.classList.remove('speaking');
        };
        
        utterance.onpause = () => {
            isPaused = true;
            setStatus('Paused', '');
            updateButtonStates();
        };
        
        utterance.onresume = () => {
            isPaused = false;
            setStatus('Speaking...', 'active');
            updateButtonStates();
        };
        
        synth.speak(utterance);
    }

    // Stop speech
    function stopSpeech() {
        synth.cancel();
        isSpeaking = false;
        isPaused = false;
        setStatus('Stopped', '');
        updateButtonStates();
        speakButton.classList.remove('speaking');
    }

    // Pause speech
    function pauseSpeech() {
        if (isSpeaking && !isPaused) {
            synth.pause();
        }
    }

    // Resume speech
    function resumeSpeech() {
        if (isSpeaking && isPaused) {
            synth.resume();
        }
    }

    // Set status message
    function setStatus(message, type = '') {
        status.textContent = message;
        status.className = 'status-value';
        
        if (type === 'active') {
            status.classList.add('status-active');
        } else if (type === 'warning') {
            status.classList.add('status-warning');
        }
    }

    // Update button states based on speech status
    function updateButtonStates() {
        speakButton.disabled = isSpeaking && !isPaused;
        pauseButton.disabled = !isSpeaking || isPaused;
        resumeButton.disabled = !isSpeaking || !isPaused;
        stopButton.disabled = !isSpeaking;
    }

    // Initialize the app
    init();
});