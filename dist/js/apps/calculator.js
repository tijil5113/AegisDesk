// Calculator App
class CalculatorApp {
    constructor() {
        this.windowId = 'calculator';
        this.currentValue = '0';
        this.previousValue = null;
        this.operator = null;
        this.waitingForOperand = false;
    }

    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'Calculator',
            width: 400,
            height: 550,
            class: 'app-calculator',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="4" y="2" width="16" height="20" rx="2"></rect>
                <line x1="8" y1="6" x2="16" y2="6"></line>
                <line x1="8" y1="10" x2="16" y2="10"></line>
                <line x1="8" y1="14" x2="16" y2="14"></line>
                <line x1="8" y1="18" x2="16" y2="18"></line>
            </svg>`,
            content: content
        });

        this.attachEvents(window);
    }

    render() {
        return `
            <div class="calculator-container">
                <div class="calculator-display">
                    <div class="calculator-screen" id="calc-display">0</div>
                </div>
                <div class="calculator-buttons">
                    <button class="calc-btn calc-btn-clear" data-action="clear">C</button>
                    <button class="calc-btn calc-btn-clear" data-action="clearEntry">CE</button>
                    <button class="calc-btn calc-btn-operator" data-action="backspace">⌫</button>
                    <button class="calc-btn calc-btn-operator" data-value="÷">÷</button>
                    
                    <button class="calc-btn calc-btn-number" data-value="7">7</button>
                    <button class="calc-btn calc-btn-number" data-value="8">8</button>
                    <button class="calc-btn calc-btn-number" data-value="9">9</button>
                    <button class="calc-btn calc-btn-operator" data-value="×">×</button>
                    
                    <button class="calc-btn calc-btn-number" data-value="4">4</button>
                    <button class="calc-btn calc-btn-number" data-value="5">5</button>
                    <button class="calc-btn calc-btn-number" data-value="6">6</button>
                    <button class="calc-btn calc-btn-operator" data-value="-">-</button>
                    
                    <button class="calc-btn calc-btn-number" data-value="1">1</button>
                    <button class="calc-btn calc-btn-number" data-value="2">2</button>
                    <button class="calc-btn calc-btn-number" data-value="3">3</button>
                    <button class="calc-btn calc-btn-operator" data-value="+">+</button>
                    
                    <button class="calc-btn calc-btn-number calc-btn-zero" data-value="0">0</button>
                    <button class="calc-btn calc-btn-number" data-value=".">.</button>
                    <button class="calc-btn calc-btn-equals" data-action="equals">=</button>
                </div>
            </div>
        `;
    }

    attachEvents(window) {
        const content = window.querySelector('.window-content');
        const display = content.querySelector('#calc-display');
        const buttons = content.querySelectorAll('.calc-btn');

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const value = button.dataset.value;
                const action = button.dataset.action;

                if (action) {
                    this.handleAction(action);
                } else if (value) {
                    this.inputNumber(value);
                }
                display.textContent = this.currentValue;
            });
        });

        // Keyboard support
        content.addEventListener('keydown', (e) => {
            if (e.key >= '0' && e.key <= '9' || e.key === '.') {
                this.inputNumber(e.key);
                display.textContent = this.currentValue;
            } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
                const operators = { '+': '+', '-': '-', '*': '×', '/': '÷' };
                this.inputOperator(operators[e.key]);
                display.textContent = this.currentValue;
            } else if (e.key === 'Enter' || e.key === '=') {
                this.calculate();
                display.textContent = this.currentValue;
            } else if (e.key === 'Escape') {
                this.clear();
                display.textContent = this.currentValue;
            } else if (e.key === 'Backspace') {
                this.backspace();
                display.textContent = this.currentValue;
            }
        });
    }

    inputNumber(num) {
        if (this.waitingForOperand) {
            this.currentValue = num;
            this.waitingForOperand = false;
        } else {
            this.currentValue = this.currentValue === '0' ? num : this.currentValue + num;
        }
    }

    inputOperator(nextOperator) {
        const inputValue = parseFloat(this.currentValue);

        if (this.previousValue === null) {
            this.previousValue = inputValue;
        } else if (this.operator) {
            const currentValue = this.previousValue || 0;
            const newValue = this.performCalculation();

            this.currentValue = String(newValue);
            this.previousValue = newValue;
        }

        this.waitingForOperand = true;
        this.operator = nextOperator;
    }

    performCalculation() {
        const prev = parseFloat(this.previousValue);
        const current = parseFloat(this.currentValue);

        if (isNaN(prev) || isNaN(current)) return current;

        switch (this.operator) {
            case '+':
                return prev + current;
            case '-':
                return prev - current;
            case '×':
                return prev * current;
            case '÷':
                return current !== 0 ? prev / current : 0;
            default:
                return current;
        }
    }

    calculate() {
        if (this.previousValue !== null && this.operator) {
            const newValue = this.performCalculation();
            this.currentValue = String(newValue);
            this.previousValue = null;
            this.operator = null;
            this.waitingForOperand = true;
        }
    }

    clear() {
        this.currentValue = '0';
        this.previousValue = null;
        this.operator = null;
        this.waitingForOperand = false;
    }

    clearEntry() {
        this.currentValue = '0';
    }

    backspace() {
        if (this.currentValue.length > 1) {
            this.currentValue = this.currentValue.slice(0, -1);
        } else {
            this.currentValue = '0';
        }
    }

    handleAction(action) {
        switch (action) {
            case 'clear':
                this.clear();
                break;
            case 'clearEntry':
                this.clearEntry();
                break;
            case 'backspace':
                this.backspace();
                break;
            case 'equals':
                this.calculate();
                break;
        }
    }
}

const calculatorApp = new CalculatorApp();
