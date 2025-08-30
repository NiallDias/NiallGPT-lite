import { GoogleGenAI } from "https://esm.sh/@google/genai@^1.11.0";

const SYSTEM_INSTRUCTION = "You are NiallGPT. If anyone asks who made you, who is your creator, or who is Niall, you must answer 'Niall Linus Dias made it he is a pro coder, musician and a creative person. If you want more of his details, ask NiallGPT'. For all other questions, answer helpfully and concisely. Do not use any markdown formatting. All responses must be in plain text.";

const SVG_SEND = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>`;
const LOADER_HTML = `<div class="loader"></div>`;
const SVG_BOT_AVATAR = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect x="4" y="12" width="16" height="8" rx="2"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m17 20 2-4-2-4"/><path d="m7 20-2-4 2-4"/></svg>`;
const SVG_USER_AVATAR = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let ai;
    let chat;
    let chats = [];
    let activeChatId = null;
    let isChatLoading = false;
    let isImageLoading = false;
    const CHATS_KEY = 'chats';
    const ACTIVE_CHAT_ID_KEY = 'active-chat-id';

    // --- DOM ELEMENTS ---
    const navChatButton = document.getElementById('nav-chat');
    const navImageButton = document.getElementById('nav-image');
    const chatView = document.getElementById('chat-view');
    const imageGeneratorView = document.getElementById('image-generator-view');
    const apiKeyErrorView = document.getElementById('api-key-error');

    // Chat View elements
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const chatMessagesContainer = document.getElementById('chat-messages');
    const newChatButton = document.getElementById('new-chat-button');
    const chatListContainer = document.getElementById('chat-list');

    // Image Generator View elements
    const imagePrompt = document.getElementById('image-prompt');
    const generateButton = document.getElementById('generate-button');
    const imageDisplay = document.getElementById('image-display');
    const downloadImageButton = document.getElementById('download-image-button');

    // Theme elements
    const themeToggleButton = document.getElementById('theme-toggle');
    const themeIconSun = document.getElementById('theme-icon-sun');
    const themeIconMoon = document.getElementById('theme-icon-moon');
    const themeIconSlate = document.getElementById('theme-icon-slate');
    
    // --- THEME ---
    const THEME_KEY = 'theme-preference';
    const THEMES = ['light', 'rgb-delight', 'slate'];

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        themeIconSun.style.display = theme === 'light' ? 'block' : 'none';
        themeIconMoon.style.display = theme === 'rgb-delight' ? 'block' : 'none';
        themeIconSlate.style.display = theme === 'slate' ? 'block' : 'none';
    }

    function cycleTheme() {
        const currentTheme = document.body.getAttribute('data-theme') || 'light';
        let currentIndex = THEMES.indexOf(currentTheme);
        if (currentIndex === -1) {
            currentIndex = 0;
        }
        const nextIndex = (currentIndex + 1) % THEMES.length;
        const newTheme = THEMES[nextIndex];
        localStorage.setItem(THEME_KEY, newTheme);
        applyTheme(newTheme);
    }

    function initializeTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
        applyTheme(THEMES.includes(savedTheme) ? savedTheme : 'light');
    }
    
    themeToggleButton.addEventListener('click', cycleTheme);

    // --- INITIALIZATION ---
    function initializeApi() {
        try {
            if (!process.env.API_KEY) {
                throw new Error("API_KEY environment variable not set.");
            }
            ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            apiKeyErrorView.style.display = 'none';
            chatView.style.display = 'flex';
            loadChats();
        } catch (e) {
            console.error(e);
            chatView.style.display = 'none';
            imageGeneratorView.style.display = 'none';
            apiKeyErrorView.style.display = 'flex';
        }
    }
    
    // --- MULTI-CHAT MANAGEMENT ---

    function loadChats() {
        const savedChats = localStorage.getItem(CHATS_KEY);
        chats = savedChats ? JSON.parse(savedChats) : [];

        // --- Data Migration ---
        // This ensures old chats with role 'bot' are updated to 'model' for API compatibility.
        let needsSaveAfterMigration = false;
        chats.forEach(chat => {
            if (chat.history) {
                chat.history.forEach(message => {
                    if (message.role === 'bot') {
                        message.role = 'model';
                        needsSaveAfterMigration = true;
                    }
                });
            }
        });

        if (needsSaveAfterMigration) {
            localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
        }
        // --- End Migration ---

        const savedActiveId = localStorage.getItem(ACTIVE_CHAT_ID_KEY);
        activeChatId = savedActiveId ? parseInt(savedActiveId) : null;
        
        if (chats.length === 0) {
            createNewChat();
        } else {
            if (!activeChatId || !chats.find(c => c.id === activeChatId)) {
                activeChatId = chats[0].id;
            }
            renderChatList();
            loadActiveChat();
        }
    }

    function saveChats() {
        localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
        localStorage.setItem(ACTIVE_CHAT_ID_KEY, activeChatId);
    }
    
    function createNewChat() {
        const newChat = {
            id: Date.now(),
            title: 'New Chat',
            history: [],
        };
        chats.unshift(newChat);
        activeChatId = newChat.id;
        saveChats();
        renderChatList();
        loadActiveChat();
    }
    
    function loadActiveChat() {
        if (!activeChatId) return;
        const activeChat = chats.find(c => c.id === activeChatId);
        if (!activeChat) return;

        chatMessagesContainer.innerHTML = '';
        if (activeChat.history.length === 0) {
             addChatMessage('bot', "Hello! I'm NiallGPT. How can I help you today?");
        } else {
            activeChat.history.forEach(message => addChatMessage(message.role, message.content));
        }

        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction: SYSTEM_INSTRUCTION },
            history: activeChat.history.map(m => ({
                role: m.role, // This now correctly passes 'user' or 'model'
                parts: [{ text: m.content }]
            }))
        });
    }

    function switchChat(chatId) {
        if (chatId === activeChatId) return;
        activeChatId = chatId;
        saveChats();
        renderChatList();
        loadActiveChat();
    }

    function renderChatList() {
        chatListContainer.innerHTML = '';
        chats.forEach(chat => {
            const li = document.createElement('li');
            li.className = `chat-list-item ${chat.id === activeChatId ? 'active' : ''}`;
            li.dataset.chatId = chat.id;

            const span = document.createElement('span');
            span.textContent = chat.title;
            li.appendChild(span);

            li.addEventListener('click', () => {
                switchChat(chat.id);
            });

            chatListContainer.appendChild(li);
        });
    }

    function addMessageToActiveChat(role, content) {
        const activeChat = chats.find(c => c.id === activeChatId);
        if (activeChat) {
            activeChat.history.push({ role, content });
            
            // Generate title from first user prompt
            if (activeChat.title === 'New Chat' && role === 'user' && content) {
                const newTitle = content.split(' ').slice(0, 4).join(' ') + (content.length > 30 ? '...' : '');
                activeChat.title = newTitle;
                renderChatList();
            }
            saveChats();
        }
    }


    // --- VIEW SWITCHING ---
    function switchView(view) {
        if (!ai) return; // Don't switch if API is not initialized
        if (view === 'chat') {
            chatView.style.display = 'flex';
            imageGeneratorView.style.display = 'none';
            navChatButton.classList.add('active');
            navImageButton.classList.remove('active');
        } else {
            chatView.style.display = 'none';
            imageGeneratorView.style.display = 'flex';
            navChatButton.classList.remove('active');
            navImageButton.classList.add('active');
        }
    }

    navChatButton.addEventListener('click', () => switchView('chat'));
    navImageButton.addEventListener('click', () => switchView('image'));
    newChatButton.addEventListener('click', createNewChat);
    
    // --- CHAT ---
    function addChatMessage(role, text) {
        const displayRole = (role === 'model' || role === 'bot') ? 'bot' : 'user';
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${displayRole}`;

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'chat-avatar';
        avatarDiv.innerHTML = displayRole === 'bot' ? SVG_BOT_AVATAR : SVG_USER_AVATAR;
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'chat-bubble';
        bubbleDiv.textContent = text;
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(bubbleDiv);
        chatMessagesContainer.appendChild(messageDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        return bubbleDiv;
    }
    
    async function handleSendMessage(e) {
        e.preventDefault();
        const prompt = chatInput.value.trim();
        if (!prompt || isChatLoading || !chat) return;

        setChatLoading(true);
        addChatMessage('user', prompt);
        addMessageToActiveChat('user', prompt);
        chatInput.value = '';
        handleChatInput(); // Reset height and button state

        try {
            const stream = await chat.sendMessageStream({ message: prompt });
            const botBubble = addChatMessage('bot', '');

            let accumulatedText = '';
            for await (const chunk of stream) {
                const chunkText = chunk.text;
                if (chunkText) {
                    accumulatedText += chunkText;
                    botBubble.textContent = accumulatedText; 
                    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
                }
            }
            addMessageToActiveChat('model', accumulatedText);
        } catch (error) {
            console.error(error);
            const errorMessage = 'Sorry, something went wrong. Please try again.';
            addChatMessage('bot', errorMessage);
            addMessageToActiveChat('model', errorMessage);
        } finally {
            setChatLoading(false);
        }
    }

    function setChatLoading(isLoading) {
        isChatLoading = isLoading;
        chatInput.disabled = isLoading;
        sendButton.innerHTML = isLoading ? LOADER_HTML : SVG_SEND;
        if (!isLoading) {
            handleChatInput(); // Re-evaluate button disabled state
        } else {
            sendButton.disabled = true;
        }
    }
    
    function handleChatInput() {
        const prompt = chatInput.value.trim();
        sendButton.disabled = !prompt;

        // Auto-grow textarea
        chatInput.style.height = 'auto';
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    }

    function handleChatKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
        }
    }

    chatForm.addEventListener('submit', handleSendMessage);
    chatInput.addEventListener('input', handleChatInput);
    chatInput.addEventListener('keydown', handleChatKeydown);
    
    // --- IMAGE GENERATOR ---
    async function handleGenerateImage() {
        const prompt = imagePrompt.value.trim();
        if (!prompt || isImageLoading || !ai) return;

        setImageLoading(true);
        imageDisplay.innerHTML = LOADER_HTML;
        downloadImageButton.style.display = 'none';
        
        try {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: '1:1',
                },
            });
            const base64Image = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64Image}`;
            imageDisplay.innerHTML = `<img src="${imageUrl}" alt="${prompt}">`;
            
            downloadImageButton.href = imageUrl;
            downloadImageButton.style.display = 'flex';

        } catch (error) {
            console.error(error);
            const placeholder = imageDisplay.querySelector('.image-placeholder');
            if (placeholder) {
              placeholder.querySelector('span').textContent = 'Failed to generate image. Please try again.';
              imageDisplay.innerHTML = placeholder.outerHTML;
            } else {
              imageDisplay.innerHTML = 'Failed to generate image. Please try again.';
            }
        } finally {
            setImageLoading(false);
        }
    }
    
    function setImageLoading(isLoading) {
        isImageLoading = isLoading;
        imagePrompt.disabled = isLoading;
        generateButton.disabled = isLoading;
        generateButton.innerHTML = isLoading ? `${LOADER_HTML} Generating...` : 'Generate Image';
    }

    generateButton.addEventListener('click', handleGenerateImage);

    // --- RUN APP ---
    initializeTheme();
    initializeApi();
    handleChatInput(); // Set initial state of send button
});