// Terminal App - Command line interface
class TerminalApp {
    constructor() {
        this.windowId = 'terminal';
        this.history = storage.get('terminalHistory', []);
        this.historyIndex = -1;
    }

    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'Terminal',
            width: 800,
            height: 600,
            class: 'app-terminal',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="4 7 4 4 20 4 20 7"></polyline>
                <line x1="9" y1="20" x2="15" y2="20"></line>
                <line x1="12" y1="4" x2="12" y2="20"></line>
            </svg>`,
            content: content
        });

        this.attachEvents(window);
    }

    render() {
        return `
            <div class="terminal-container">
                <div class="terminal-header">
                    <div class="terminal-user">user@aegisdesk:~$</div>
                </div>
                <div class="terminal-output" id="terminal-output"></div>
                <div class="terminal-input-line">
                    <span class="terminal-prompt">user@aegisdesk:~$</span>
                    <input type="text" class="terminal-input" id="terminal-input" autocomplete="off" spellcheck="false" />
                </div>
            </div>
        `;
    }

    attachEvents(window) {
        const input = window.querySelector('#terminal-input');
        const output = window.querySelector('#terminal-output');

        if (!input || !output) return;

        // Welcome message
        this.appendOutput(output, 'Welcome to AegisDesk Terminal v1.0');
        this.appendOutput(output, 'Type "help" for available commands.');
        this.appendOutput(output, '');

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const command = input.value.trim();
                if (command) {
                    this.executeCommand(command, output);
                    this.history.push(command);
                    this.historyIndex = this.history.length;
                    if (this.history.length > 100) {
                        this.history.shift();
                    }
                    this.save();
                    input.value = '';
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    input.value = this.history[this.historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.historyIndex < this.history.length - 1) {
                    this.historyIndex++;
                    input.value = this.history[this.historyIndex] || '';
                } else {
                    this.historyIndex = this.history.length;
                    input.value = '';
                }
            }
        });

        input.focus();
    }

    executeCommand(command, output) {
        this.appendOutput(output, `user@aegisdesk:~$ ${command}`);

        const parts = command.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (cmd) {
            case 'help':
                this.appendOutput(output, 'Available commands:');
                this.appendOutput(output, '  help          - Show this help message');
                this.appendOutput(output, '  clear         - Clear terminal screen');
                this.appendOutput(output, '  echo <text>   - Echo text');
                this.appendOutput(output, '  date          - Show current date and time');
                this.appendOutput(output, '  whoami        - Show current user');
                this.appendOutput(output, '  pwd           - Show current directory');
                this.appendOutput(output, '  ls            - List files');
                this.appendOutput(output, '  calc <expr>   - Calculate expression');
                this.appendOutput(output, '  theme <dark/light> - Change theme');
                break;
            case 'clear':
                output.innerHTML = '';
                break;
            case 'echo':
                this.appendOutput(output, args.join(' '));
                break;
            case 'date':
                this.appendOutput(output, new Date().toString());
                break;
            case 'whoami':
                this.appendOutput(output, 'user');
                break;
            case 'pwd':
                this.appendOutput(output, '/home/user/aegisdesk');
                break;
            case 'ls':
                this.appendOutput(output, 'Documents  Downloads  Desktop  Music  Pictures');
                break;
            case 'calc':
                try {
                    const expr = args.join(' ');
                    const result = Function(`"use strict"; return (${expr})`)();
                    this.appendOutput(output, result.toString());
                } catch (e) {
                    this.appendOutput(output, `Error: ${e.message}`, 'error');
                }
                break;
            case 'theme':
                if (args[0] === 'dark' || args[0] === 'light') {
                    document.body.setAttribute('data-theme', args[0]);
                    this.appendOutput(output, `Theme set to ${args[0]}`);
                } else {
                    this.appendOutput(output, 'Usage: theme <dark|light>', 'error');
                }
                break;
            default:
                this.appendOutput(output, `Command not found: ${cmd}. Type "help" for available commands.`, 'error');
        }

        this.appendOutput(output, '');
    }

    appendOutput(output, text, type = 'normal') {
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;
        line.textContent = text;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    save() {
        storage.set('terminalHistory', this.history);
    }
}

const terminalApp = new TerminalApp();
