// Ussyverse Monitor - Renderer Process

let HUB_IP = 'localhost';
let HUB_PORT = 3002;
let eventSource = null;
let currentSession = null;
let sessions = [];
let autoScroll = true;
let maxLines = 20;
let fontSize = 14;
let lastMessageCount = 0; // Track how many messages we've already rendered
let sessionContent = '';   // Store full session content
let isLoadingSession = false; // Prevent concurrent loads
let reconnectTimeout = null; // Track reconnection timer

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  initializeEventListeners();
  connectToHub();
  loadSessions();
});

// Load configuration from main process
async function loadConfig() {
  try {
    const config = await window.electronAPI.getConfig();
    if (config) {
      HUB_IP = config.hubIP || 'localhost';
      HUB_PORT = config.hubPort || 3002;
      
      // Update UI elements if they exist
      const ipInput = document.getElementById('hub-ip');
      const portInput = document.getElementById('hub-port');
      if (ipInput) ipInput.value = HUB_IP;
      if (portInput) portInput.value = HUB_PORT;
      
      console.log('Loaded config:', { HUB_IP, HUB_PORT });
    }
  } catch (error) {
    console.error('Error loading config:', error);
    showNotification('Failed to load configuration', 'warning');
  }
}

// Helper to get hub URL
function getHubURL() {
  return `http://${HUB_IP}:${HUB_PORT}`;
}

// Initialize Event Listeners
function initializeEventListeners() {
  // Settings Panel Toggle
  const settingsBtn = document.getElementById('settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsOverlay = document.getElementById('settings-overlay');

  function toggleSettings(show) {
    if (show) {
      settingsPanel.classList.add('active');
      settingsOverlay.classList.add('active');
    } else {
      settingsPanel.classList.remove('active');
      settingsOverlay.classList.remove('active');
    }
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => toggleSettings(true));
  }

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => toggleSettings(false));
  }

  if (settingsOverlay) {
    settingsOverlay.addEventListener('click', () => toggleSettings(false));
  }

  // Config UI handlers
  const saveConfigBtn = document.getElementById('save-config');
  const testConnectionBtn = document.getElementById('test-connection');
  
  if (saveConfigBtn) {
    saveConfigBtn.addEventListener('click', async () => {
      const ipInput = document.getElementById('hub-ip');
      const portInput = document.getElementById('hub-port');
      
      const newConfig = {
        hubIP: ipInput.value.trim(),
        hubPort: parseInt(portInput.value) || 3002
      };
      
      const result = await window.electronAPI.saveConfig(newConfig);
      
      if (result.success) {
        showNotification('Configuration saved successfully', 'success');
        HUB_IP = newConfig.hubIP;
        HUB_PORT = newConfig.hubPort;
        
        // Reconnect with new config
        connectToHub();
      } else {
        showNotification('Failed to save configuration: ' + (result.error || 'Unknown error'), 'danger');
      }
    });
  }
  
  if (testConnectionBtn) {
    testConnectionBtn.addEventListener('click', async () => {
      const result = await window.electronAPI.testConnection();
      
      if (result.connected) {
        showNotification('Successfully connected to hub', 'success');
      } else {
        showNotification('Connection failed: ' + (result.error || 'Unknown error'), 'danger');
      }
    });
  }
  
  // Emergency Stop Button
  document.getElementById('emergency-stop').addEventListener('click', async () => {
    if (confirm('Are you sure you want to STOP bot? This will terminate all agent processes.')) {
      const result = await window.electronAPI.emergencyStop();
      if (result.success) {
        showNotification('Emergency Stop Triggered', 'danger');
      } else {
        showNotification('Failed to stop bot: ' + result.error, 'danger');
      }
    }
  });

  // Export HTML Button
  document.getElementById('export-btn').addEventListener('click', exportToHTML);

  // Send Message Button
  document.getElementById('send-btn').addEventListener('click', sendMessage);  
  // Message Input - Ctrl+Enter to send
  document.getElementById('message-input').addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      sendMessage();
    }
  });

  // Font Size Control
  const fontSizeInput = document.getElementById('font-size');
  fontSizeInput.addEventListener('input', (e) => {
    fontSize = parseInt(e.target.value);
    document.getElementById('font-size-value').textContent = fontSize + 'px';
    document.getElementById('chat-container').style.fontSize = fontSize + 'px';
  });

  // Max Lines Control
  document.getElementById('max-lines').addEventListener('input', (e) => {
    maxLines = parseInt(e.target.value);
    // Re-render current session if loaded
    if (currentSession && sessionContent) {
      lastMessageCount = 0; // Force full re-render with new truncation
      renderSession(sessionContent, false);
    }
  });

  // Auto-scroll Toggle
  document.getElementById('auto-scroll-toggle').addEventListener('click', (e) => {
    autoScroll = !autoScroll;
    e.target.classList.toggle('active', autoScroll);
  });

  // Always on Top Toggle
  document.getElementById('always-on-top-toggle').addEventListener('click', async (e) => {
    const flag = !e.target.classList.contains('active');
    await window.electronAPI.setAlwaysOnTop(flag);
    e.target.classList.toggle('active', flag);
  });
}

// Connect to Hub via SSE
function connectToHub() {
  // Clear any pending reconnect
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Close existing connection to prevent leaks
  if (eventSource) {
    console.log('Closing existing EventSource connection...');
    eventSource.close();
    eventSource = null;
  }

  updateStatus('connecting', 'Connecting...');  
  const hubURL = getHubURL();
  
  try {
    eventSource = new EventSource(hubURL + '/api/events');
    
    eventSource.onopen = () => {
      updateStatus('connected', 'Connected');
      console.log('Connected to Hub');
    };
    
    eventSource.onerror = (error) => {
      updateStatus('disconnected', 'Disconnected');
      console.error('SSE Error:', error);

      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      // Attempt reconnection after 5 seconds
      if (!reconnectTimeout) {
        reconnectTimeout = setTimeout(() => {
          reconnectTimeout = null;
          console.log('Attempting to reconnect...');
          connectToHub();
        }, 5000);
      }
    };
    
    eventSource.addEventListener('initial', (event) => {
      const data = JSON.parse(event.data);
      console.log('Initial data received:', data);
    });

    eventSource.addEventListener('log', (event) => {
      const data = JSON.parse(event.data);
      console.log('Log event:', data);
    });

    eventSource.addEventListener('session', (event) => {
      const data = JSON.parse(event.data);
      console.log('Session update:', data);

      // If this is the currently viewed session, refresh it incrementally
      if (currentSession && data.id === currentSession) {
        loadSessionIncremental(currentSession);
      }

      // Refresh session list
      loadSessions();
    });

    eventSource.addEventListener('heartbeat', (event) => {
      const data = JSON.parse(event.data);
      console.log('Heartbeat:', data);
    });
  } catch (error) {
    console.error('Error creating EventSource:', error);
    updateStatus('disconnected', 'Error');

    // Retry on creation error too
    if (!reconnectTimeout) {
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        connectToHub();
      }, 5000);
    }
  }
}

// Update Connection Status
function updateStatus(status, text) {
  const dot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');  
  dot.className = 'status-dot';
  if (status === 'connected') {
    dot.classList.add('connected');
  }
  
  statusText.textContent = text;
}

// Load Sessions List
async function loadSessions() {
  try {
    const hubURL = getHubURL();
    const response = await fetch(hubURL + '/api/sessions');
    const data = await response.json();
    sessions = data.sessions || [];
    
    document.getElementById('session-count').textContent = '(' + sessions.length + ')';
    
    const listEl = document.getElementById('session-list');
    
    if (sessions.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-text">No active sessions</div>
        </div>
      `;
      return;
    }
    
    listEl.innerHTML = sessions.map(s => `
      <div class="session-item ${currentSession === s.id ? 'active' : ''}"
           onclick="loadSessionById('${s.id}')">
        <div class="session-title">${escapeHtml(s.title || s.id)}</div>
        <div class="session-meta">
          <span>${(s.size / 1024).toFixed(1)} KB</span>
          <span>${new Date(s.modified).toLocaleTimeString()}</span>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error loading sessions:', error);
    showNotification('Failed to load sessions', 'danger');
  }
}

// Load Session by ID
window.loadSessionById = function(id) {
  currentSession = id;
  lastMessageCount = 0; // Reset counter for new session
  sessionContent = '';  // Clear stored content
  loadSession(id);  
  // Update active state in sidebar
  document.querySelectorAll('.session-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.closest('.session-item').classList.add('active');
};

// Load Session Content (full reload)
async function loadSession(id) {
  if (isLoadingSession) return; // Prevent concurrent loads
  isLoadingSession = true;
  
  try {
    const hubURL = getHubURL();
    const response = await fetch(hubURL + '/api/sessions/' + id);
    const data = await response.json();
    
    sessionContent = data.content;
    lastMessageCount = 0; // Reset counter
    renderSession(data.content, false); // false = full render
  } catch (error) {
    console.error('Error loading session:', error);
    showNotification('Failed to load session', 'danger');
  } finally {
    isLoadingSession = false;
  }
}

// Load Session Incremental (only new messages)
async function loadSessionIncremental(id) {
  if (isLoadingSession) return; // Prevent concurrent loads
  isLoadingSession = true;
  
  try {
    const hubURL = getHubURL();
    const response = await fetch(hubURL + '/api/sessions/' + id);
    const data = await response.json();
    
    // Check if content has changed
    if (data.content === sessionContent) {
      isLoadingSession = false;
      return; // No changes
    }
    
    sessionContent = data.content;
    renderSession(data.content, true); // true = incremental render
  } catch (error) {
    console.error('Error loading session:', error);
  } finally {
    isLoadingSession = false;
  }
}

// Render Session Content
function renderSession(content, incremental = false) {
  const container = document.getElementById('chat-container');
  const lines = content.split('\n').filter(l => l.trim());
  
  if (lines.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💬</div>
        <div class="empty-text">No messages in this session</div>
      </div>
    `;
    lastMessageCount = 0;
    return;
  }
  
  const messages = lines.map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
  }).filter(m => m && m.type === 'message' && m.message);
  
  // Incremental update: only append new messages
  if (incremental && messages.length > lastMessageCount) {
    const newMessages = messages.slice(lastMessageCount);
    console.log(`Appending ${newMessages.length} new messages (${lastMessageCount} -> ${messages.length})`);
    
    newMessages.forEach((entry, idx) => {
      const actualIndex = lastMessageCount + idx;
      const bubble = createMessageBubble(entry, actualIndex);
      container.insertAdjacentHTML('beforeend', bubble);
    });
    
    lastMessageCount = messages.length;
    
    if (autoScroll) {
      container.scrollTop = container.scrollHeight;
    }
    return;
  }
  
  // Full render: replace everything
  console.log(`Full render: ${messages.length} messages`);
  container.innerHTML = messages.map((entry, index) => 
    createMessageBubble(entry, index)
  ).join('');
  
  lastMessageCount = messages.length;
  
  if (autoScroll) {
    container.scrollTop = container.scrollHeight;
  }
}

// Create a single message bubble HTML
function createMessageBubble(entry, index) {
  const msg = entry.message;
  const role = msg.role || 'unknown';
  const timestamp = new Date(entry.timestamp).toLocaleTimeString();
  
  // Extract content
  let contentText = '';
  if (Array.isArray(msg.content)) {
    contentText = msg.content
      .filter(c => c.type === 'text')
      .map(c => c.text || '')
      .join('\n');
  } else {
    contentText = msg.content || '';
  }
  
  // Check if content should be truncated
  const lineCount = contentText.split('\n').length;
  const shouldTruncate = lineCount > maxLines;
  
  return `
    <div class="chat-bubble ${role}" style="animation-delay: ${(index % 10) * 0.05}s" data-index="${index}">
      <div class="chat-header">
        <span class="chat-role">${role.toUpperCase()}</span>
        <span class="chat-time">${timestamp}</span>
      </div>
      <div class="chat-content ${shouldTruncate ? 'truncated' : ''}"
           id="content-${index}"
           style="max-height: ${shouldTruncate ? (maxLines * fontSize * 1.6) + 'px' : 'none'}">
        ${renderMarkdown(contentText)}
      </div>
      ${shouldTruncate ? `
        <button class="expand-btn" onclick="toggleExpand('content-${index}', this)">
          Show More
        </button>
      ` : ''}
    </div>
  `;
}

// Toggle Expand/Collapse
window.toggleExpand = function(contentId, button) {
  const content = document.getElementById(contentId);
  const isTruncated = content.classList.contains('truncated');
  
  if (isTruncated) {
    content.style.maxHeight = 'none';
    content.classList.remove('truncated');
    button.textContent = 'Show Less';
  } else {
    content.style.maxHeight = (maxLines * fontSize * 1.6) + 'px';
    content.classList.add('truncated');
    button.textContent = 'Show More';
  }
};

// Simple Markdown Renderer (basic support)
function renderMarkdown(text) {
  let html = escapeHtml(text);
  
  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code>${code}</code></pre>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bold
  html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

// Send Message
async function sendMessage() {
  const input = document.getElementById('message-input');
  const message = input.value.trim();
  
  if (!message) {
    showNotification('Please enter a message', 'warning');
    return;
  }
  
  if (!currentSession) {
    showNotification('No active session selected', 'warning');
    return;
  }
  
  try {
    const result = await window.electronAPI.sendMessage(message);
    
    if (result.success) {
      showNotification('Message sent successfully', 'success');
      input.value = '';
      
      // Refresh session after a short delay to see the new message
      setTimeout(() => loadSession(currentSession), 1000);
    } else {
      showNotification('Failed to send message: ' + (result.error || 'Unknown error'), 'danger');
    }
  } catch (error) {
    console.error('Error sending message:', error);
    showNotification('Error: ' + error.message, 'danger');
  }
}

// Export to HTML
async function exportToHTML() {
  if (!currentSession) {
    showNotification('No session selected', 'warning');
    return;
  }
  
  try {
    const hubURL = getHubURL();
    const response = await fetch(hubURL + '/api/sessions/' + currentSession);
    const data = await response.json();
    const lines = data.content.split('\n').filter(l => l.trim());
    
    const messages = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(m => m && m.type === 'message' && m.message);
    
    // Create beautiful HTML export
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Export - ${currentSession}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      min-height: 100vh;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #00d9ff, #ff00aa);
      color: white;
      padding: 32px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 8px;
    }
    .header p {
      opacity: 0.9;
      font-size: 14px;
    }
    .messages {
      padding: 32px;
    }
    .message {
      margin-bottom: 24px;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .message.user {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
    }
    .message.assistant {
      background: #f3e5f5;
      border-left: 4px solid #9c27b0;
    }
    .message-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(0,0,0,0.1);
    }
    .role {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
    .timestamp {
      color: #666;
      font-size: 11px;
    }
    .content {
      line-height: 1.6;
      color: #333;
    }
    pre {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 12px 0;
    }
    code {
      font-family: 'Fira Code', monospace;
      font-size: 13px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Ussyverse Session Export</h1>
      <p>Session: ${escapeHtml(currentSession)}</p>
      <p>Exported: ${new Date().toLocaleString()}</p>
    </div>
    <div class="messages">
      ${messages.map(entry => {
        const msg = entry.message;
        const role = msg.role || 'unknown';
        const timestamp = new Date(entry.timestamp).toLocaleString();
        
        let contentText = '';
        if (Array.isArray(msg.content)) {
          contentText = msg.content
            .filter(c => c.type === 'text')
            .map(c => c.text || '')
            .join('\n');
        } else {
          contentText = msg.content || '';
        }
        
        return `
          <div class="message ${role}">
            <div class="message-header">
              <span class="role">${role}</span>
              <span class="timestamp">${timestamp}</span>
            </div>
            <div class="content">${renderMarkdown(contentText)}</div>
          </div>
        `;
      }).join('')}
    </div>
    <div class="footer">
      Generated by Ussyverse Monitor
    </div>
  </div>
</body>
</html>
    `.trim();
    
    // Create download
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${currentSession.split('.')[0]}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Session exported successfully', 'success');
  } catch (error) {
    console.error('Error exporting:', error);
    showNotification('Failed to export session', 'danger');
  }
}

// Show Notification
function showNotification(message, type = 'info') {
  // Create toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'danger' ? '#ef4444' : '#f59e0b'};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    z-index: 1000;
    animation: slideInRight 0.3s ease;
    max-width: 400px;
    font-size: 14px;
    font-weight: 600;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Refresh sessions periodically
setInterval(() => {
  loadSessions();
}, 10000); // Every 10 seconds
