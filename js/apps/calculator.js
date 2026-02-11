// Calculator App - advanced, editable expression with full accuracy
class CalculatorApp {
    constructor() {
        this.windowId = 'calculator';
        this.expression = '0';
        this.result = '';
        this.justEvaluated = false;
    }

    open() {
        const contentHtml = this.render();
        const win = windowManager.createWindow(this.windowId, {
            title: 'Calculator',
            width: 430,
            height: 580,
            class: 'app-calculator',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="4" y="2" width="16" height="20" rx="2"></rect>
                <line x1="8" y1="6" x2="16" y2="6"></line>
                <line x1="8" y1="10" x2="16" y2="10"></line>
                <line x1="8" y1="14" x2="16" y2="14"></line>
                <line x1="8" y1="18" x2="16" y2="18"></line>
            </svg>`,
            content: contentHtml
        });

        const content = win.querySelector('.window-content');
        if (!content || content.dataset.calcInitialized) return;
        content.dataset.calcInitialized = '1';
        this.attachEvents(win);
        requestAnimationFrame(() => {
            const input = content.querySelector('#calc-input');
            if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        });
    }

    render() {
        return `
            <div class="calculator-container">
                <div class="calculator-display">
                    <div class="calculator-screen">
                        <input class="calculator-input" id="calc-input" type="text" spellcheck="false" autocomplete="off" value="0" aria-label="Calculator input" />
                        <div class="calculator-result" id="calc-result" aria-live="polite"></div>
                    </div>
                </div>
                <div class="calculator-buttons">
                    <button class="calc-btn calc-btn-clear" data-action="clear">C</button>
                    <button class="calc-btn calc-btn-clear" data-action="clearEntry">CE</button>
                    <button class="calc-btn calc-btn-operator" data-action="backspace">⌫</button>
                    <button class="calc-btn calc-btn-func" data-value="(">(</button>
                    <button class="calc-btn calc-btn-func" data-value=")">)</button>

                    <button class="calc-btn calc-btn-func" data-action="percent">%</button>
                    <button class="calc-btn calc-btn-func" data-action="sqrt">√</button>
                    <button class="calc-btn calc-btn-func" data-action="square">x²</button>
                    <button class="calc-btn calc-btn-func" data-action="reciprocal">1/x</button>
                    <button class="calc-btn calc-btn-operator" data-value="÷">÷</button>

                    <button class="calc-btn calc-btn-number" data-value="7">7</button>
                    <button class="calc-btn calc-btn-number" data-value="8">8</button>
                    <button class="calc-btn calc-btn-number" data-value="9">9</button>
                    <button class="calc-btn calc-btn-operator" data-value="×">×</button>
                    <button class="calc-btn calc-btn-func" data-value="^">^</button>

                    <button class="calc-btn calc-btn-number" data-value="4">4</button>
                    <button class="calc-btn calc-btn-number" data-value="5">5</button>
                    <button class="calc-btn calc-btn-number" data-value="6">6</button>
                    <button class="calc-btn calc-btn-operator" data-value="-">-</button>
                    <button class="calc-btn calc-btn-func" data-value="π">π</button>

                    <button class="calc-btn calc-btn-number" data-value="1">1</button>
                    <button class="calc-btn calc-btn-number" data-value="2">2</button>
                    <button class="calc-btn calc-btn-number" data-value="3">3</button>
                    <button class="calc-btn calc-btn-operator" data-value="+">+</button>
                    <button class="calc-btn calc-btn-func" data-action="toggleSign">±</button>

                    <button class="calc-btn calc-btn-number calc-btn-zero" data-value="0">0</button>
                    <button class="calc-btn calc-btn-number" data-value=".">.</button>
                    <button class="calc-btn calc-btn-equals" data-action="equals">=</button>
                </div>
            </div>
        `;
    }

    attachEvents(win) {
        const content = win.querySelector('.window-content');
        if (!content) return;
        const input = content.querySelector('#calc-input');
        const result = content.querySelector('#calc-result');
        const buttons = content.querySelectorAll('.calc-btn');

        const updateResult = () => {
            this.expression = input.value.trim() || '0';
            const evaluation = this.evaluateExpression(this.expression);
            if (evaluation.ok) {
                result.textContent = evaluation.display;
                result.classList.remove('calc-error');
                this.result = evaluation.display;
            } else {
                result.textContent = evaluation.message;
                result.classList.add('calc-error');
            }
        };

        const setInputValue = (value, moveCaret = true) => {
            input.value = value;
            if (moveCaret) {
                const pos = input.value.length;
                input.setSelectionRange(pos, pos);
            }
            updateResult();
        };

        const insertAtCursor = (text) => {
            const start = input.selectionStart ?? input.value.length;
            const end = input.selectionEnd ?? input.value.length;
            const before = input.value.slice(0, start);
            const after = input.value.slice(end);
            const next = this.normalizeDisplay(before + text + after);
            input.value = next || '0';
            const caret = Math.min(start + text.length, input.value.length);
            input.setSelectionRange(caret, caret);
            updateResult();
            input.focus();
        };

        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const value = button.dataset.value;
                const action = button.dataset.action;

                if (action) {
                    this.handleAction(action, { input, setInputValue, insertAtCursor, updateResult });
                } else if (value !== undefined && value !== '') {
                    insertAtCursor(value);
                }
            });
        });

        input.addEventListener('input', () => {
            const normalized = this.normalizeDisplay(input.value);
            if (normalized !== input.value) {
                const pos = input.selectionStart ?? normalized.length;
                input.value = normalized;
                input.setSelectionRange(Math.min(pos, normalized.length), Math.min(pos, normalized.length));
            }
            updateResult();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === '=') {
                e.preventDefault();
                this.handleAction('equals', { input, setInputValue, insertAtCursor, updateResult });
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.handleAction('clear', { input, setInputValue, insertAtCursor, updateResult });
            }
        });

        updateResult();
    }

    normalizeDisplay(value) {
        if (!value) return '';
        let normalized = String(value);
        normalized = normalized.replace(/\s+/g, '');
        normalized = normalized.replace(/sqrt/gi, '√');
        normalized = normalized.replace(/pi/gi, 'π');
        normalized = normalized.replace(/\*/g, '×');
        normalized = normalized.replace(/\//g, '÷');
        normalized = normalized.replace(/[^0-9+\-×÷^().%π√]/g, '');
        return normalized;
    }

    toCanonical(expr) {
        let canonical = String(expr || '').replace(/\s+/g, '');
        canonical = canonical.replace(/×/g, '*').replace(/÷/g, '/');
        canonical = canonical.replace(/π/gi, 'pi');
        canonical = canonical.replace(/√/g, 'sqrt');
        canonical = canonical.replace(/[^0-9+\-*/^().%a-z]/gi, '');
        return canonical;
    }

    handleAction(action, helpers) {
        const { input, setInputValue, insertAtCursor, updateResult } = helpers;
        switch (action) {
            case 'clear':
                this.expression = '0';
                this.result = '';
                this.justEvaluated = false;
                setInputValue('0');
                break;
            case 'clearEntry':
                this.clearEntry(input, setInputValue);
                break;
            case 'backspace':
                this.backspace(input, setInputValue);
                break;
            case 'equals':
                this.equals(input, setInputValue);
                break;
            case 'percent':
                insertAtCursor('%');
                break;
            case 'sqrt':
                insertAtCursor('√');
                break;
            case 'square':
                insertAtCursor('^2');
                break;
            case 'reciprocal':
                this.wrapLastToken(input, setInputValue, (token) => `1/(${token})`);
                break;
            case 'toggleSign':
                this.toggleSign(input, setInputValue);
                break;
            default:
                updateResult();
        }
    }

    backspace(input, setInputValue) {
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        if (start !== end) {
            const next = input.value.slice(0, start) + input.value.slice(end);
            setInputValue(next || '0', false);
            input.setSelectionRange(start, start);
            return;
        }
        const next = input.value.slice(0, Math.max(0, start - 1)) + input.value.slice(end);
        setInputValue(next || '0', false);
        input.setSelectionRange(Math.max(0, start - 1), Math.max(0, start - 1));
    }

    clearEntry(input, setInputValue) {
        const value = input.value;
        const match = value.match(/([0-9.π]+|√|\))$/);
        if (!match) {
            setInputValue('0');
            return;
        }
        const next = value.slice(0, value.length - match[0].length) || '0';
        setInputValue(next);
    }

    equals(input, setInputValue) {
        const evaluation = this.evaluateExpression(input.value);
        if (!evaluation.ok) return;
        this.expression = evaluation.raw;
        this.result = evaluation.display;
        this.justEvaluated = true;
        setInputValue(evaluation.display);
    }

    toggleSign(input, setInputValue) {
        const value = input.value;
        const match = value.match(/([0-9.π]+|\))$/);
        if (!match) {
            setInputValue(value.startsWith('-') ? value.slice(1) : `-${value}`);
            return;
        }
        const token = match[0];
        const start = value.length - token.length;
        if (token === ')') {
            setInputValue(`-(${value})`);
            return;
        }
        const before = value.slice(0, start);
        const next = token.startsWith('-') ? token.slice(1) : `-${token}`;
        setInputValue(before + next);
    }

    wrapLastToken(input, setInputValue, wrapper) {
        const value = input.value;
        const match = value.match(/([0-9.π]+|\))$/);
        if (!match) return;
        const token = match[0];
        const start = value.length - token.length;
        const before = value.slice(0, start);
        setInputValue(before + wrapper(token));
    }

    evaluateExpression(expr) {
        const canonical = this.toCanonical(expr);
        if (!canonical) {
            return { ok: true, display: '0', raw: '0' };
        }
        try {
            const tokens = this.tokenize(canonical);
            if (!tokens.length) {
                return { ok: true, display: '0', raw: '0' };
            }
            const normalized = this.insertImplicitMultiplication(tokens);
            const rpn = this.toRPN(normalized);
            const value = this.evalRPN(rpn);
            if (!Number.isFinite(value)) {
                return { ok: false, message: 'Error' };
            }
            const formatted = this.formatNumber(value);
            return { ok: true, display: formatted, raw: String(value) };
        } catch (error) {
            return { ok: false, message: 'Invalid expression' };
        }
    }

    tokenize(expr) {
        const tokens = [];
        let i = 0;
        while (i < expr.length) {
            const char = expr[i];
            if (/[0-9.]/.test(char)) {
                let num = char;
                i += 1;
                while (i < expr.length && /[0-9.]/.test(expr[i])) {
                    num += expr[i];
                    i += 1;
                }
                tokens.push({ type: 'number', value: num });
                continue;
            }
            if (char === '(' || char === ')') {
                tokens.push({ type: 'paren', value: char });
                i += 1;
                continue;
            }
            if (char === '%') {
                tokens.push({ type: 'percent', value: '%' });
                i += 1;
                continue;
            }
            if ('+-*/^'.includes(char)) {
                tokens.push({ type: 'operator', value: char });
                i += 1;
                continue;
            }
            if (/[a-z]/i.test(char)) {
                const remaining = expr.slice(i).toLowerCase();
                if (remaining.startsWith('sqrt')) {
                    tokens.push({ type: 'unary', value: 'sqrt' });
                    i += 4;
                    continue;
                }
                if (remaining.startsWith('pi')) {
                    tokens.push({ type: 'number', value: String(Math.PI) });
                    i += 2;
                    continue;
                }
            }
            i += 1;
        }
        return tokens;
    }

    insertImplicitMultiplication(tokens) {
        const result = [];
        const isValue = (token) => ['number', 'percent', 'right-paren'].includes(token.type);
        const isRightParen = (token) => token.type === 'paren' && token.value === ')';
        const isLeftParen = (token) => token.type === 'paren' && token.value === '(';
        const isStart = (token) => token.type === 'number' || isLeftParen(token) || token.type === 'unary';

        tokens.forEach((token, index) => {
            const prev = result[result.length - 1];
            const prevIsValue = prev && (prev.type === 'number' || prev.type === 'percent' || prev.type === 'right-paren');
            const nextIsStart = isStart(token);
            if (prev && prevIsValue && nextIsStart) {
                result.push({ type: 'operator', value: '*' });
            }
            if (isRightParen(token)) {
                result.push({ type: 'right-paren', value: ')' });
            } else if (isLeftParen(token)) {
                result.push({ type: 'left-paren', value: '(' });
            } else {
                result.push(token);
            }
        });
        return result;
    }

    toRPN(tokens) {
        const output = [];
        const stack = [];
        const precedence = {
            'u+': 3,
            'u-': 3,
            'sqrt': 3,
            '^': 4,
            '*': 2,
            '/': 2,
            '+': 1,
            '-': 1
        };
        const rightAssoc = new Set(['^', 'u+', 'u-', 'sqrt']);
        let prevToken = null;

        tokens.forEach((token) => {
            if (token.type === 'number') {
                output.push(token);
                prevToken = token;
                return;
            }
            if (token.type === 'percent') {
                output.push(token);
                prevToken = token;
                return;
            }
            if (token.type === 'unary') {
                stack.push(token);
                prevToken = token;
                return;
            }
            if (token.type === 'operator') {
                let op = token.value;
                if (!prevToken || (prevToken.type !== 'number' && prevToken.type !== 'right-paren' && prevToken.type !== 'percent')) {
                    op = op === '+' ? 'u+' : op === '-' ? 'u-' : op;
                }
                const opToken = { type: 'operator', value: op };
                while (stack.length) {
                    const top = stack[stack.length - 1];
                    const topOp = top.value;
                    const topPrec = precedence[topOp] ?? 0;
                    const currPrec = precedence[opToken.value] ?? 0;
                    if (top.type === 'operator' || top.type === 'unary') {
                        if ((rightAssoc.has(opToken.value) && currPrec < topPrec) || (!rightAssoc.has(opToken.value) && currPrec <= topPrec)) {
                            output.push(stack.pop());
                            continue;
                        }
                    }
                    break;
                }
                stack.push(opToken);
                prevToken = opToken;
                return;
            }
            if (token.type === 'left-paren') {
                stack.push(token);
                prevToken = token;
                return;
            }
            if (token.type === 'right-paren') {
                while (stack.length && stack[stack.length - 1].type !== 'left-paren') {
                    output.push(stack.pop());
                }
                if (stack.length && stack[stack.length - 1].type === 'left-paren') {
                    stack.pop();
                }
                if (stack.length && stack[stack.length - 1].type === 'unary') {
                    output.push(stack.pop());
                }
                prevToken = token;
            }
        });

        while (stack.length) {
            output.push(stack.pop());
        }
        return output;
    }

    evalRPN(rpn) {
        const stack = [];
        rpn.forEach((token) => {
            if (token.type === 'number') {
                stack.push(parseFloat(token.value));
                return;
            }
            if (token.type === 'percent') {
                const a = stack.pop();
                stack.push(a / 100);
                return;
            }
            if (token.type === 'unary' || (token.type === 'operator' && ['u+', 'u-', 'sqrt'].includes(token.value))) {
                const a = stack.pop();
                if (token.value === 'sqrt') {
                    stack.push(Math.sqrt(a));
                } else if (token.value === 'u-') {
                    stack.push(-a);
                } else {
                    stack.push(a);
                }
                return;
            }
            if (token.type === 'operator') {
                const b = stack.pop();
                const a = stack.pop();
                switch (token.value) {
                    case '+':
                        stack.push(a + b);
                        break;
                    case '-':
                        stack.push(a - b);
                        break;
                    case '*':
                        stack.push(a * b);
                        break;
                    case '/':
                        stack.push(b === 0 ? NaN : a / b);
                        break;
                    case '^':
                        stack.push(Math.pow(a, b));
                        break;
                    default:
                        stack.push(b);
                }
            }
        });
        return stack.pop();
    }

    formatNumber(num) {
        if (!Number.isFinite(num)) return 'Error';
        if (Object.is(num, -0)) num = 0;
        const abs = Math.abs(num);
        if (abs === 0) return '0';
        if (abs >= 1e12 || abs < 1e-9) {
            return num.toExponential(6);
        }
        const str = num.toPrecision(14);
        return str.replace(/\.?0+$/g, '');
    }
}

const calculatorApp = new CalculatorApp();
