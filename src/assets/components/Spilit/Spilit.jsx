import { useRef, useState } from 'react';
import './Spilit.css';
import { useCode } from '../../../context/CodeContext';

const Spilit = () => {
    const containerRef = useRef(null);
    const editorRef = useRef(null);
    const [leftWidth, setLeftWidth] = useState(60);
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);


    const { code, setCode, output, error, isRunning, setOutput, setError } = useCode();

    const startDragging = (e) => {
        e.preventDefault();
        document.addEventListener('mousemove', handleDragging);
        document.addEventListener('mouseup', stopDragging);
    };

    const handleDragging = (e) => {
        if (!containerRef.current) return;

        const containerWidth = containerRef.current.offsetWidth;
        const newLeftPercent = (e.clientX / containerWidth) * 100;

        const minPercent = 30;
        const maxPercent = 70;

        if (newLeftPercent >= minPercent && newLeftPercent <= maxPercent) {
            setLeftWidth(newLeftPercent);
        }
    };


    const stopDragging = () => {
        document.removeEventListener('mousemove', handleDragging);
        document.removeEventListener('mouseup', stopDragging);
    };

    const handleFormatCode = () => {
        const textArea = editorRef.current;
        if (!textArea) return;

        const lines = textArea.value.split('\n');
        const formatted = [];
        const indentSize = 4;
        let indentLevel = 0;

        // Stack to keep track of indentation context (e.g. "brace", "colon")
        const indentStack = [];

        lines.forEach((line) => {
            const trimmed = line.trim();

            // If line is a closing brace or starts with one — pop from stack
            if (trimmed === '}' || trimmed.startsWith('}')) {
                if (indentStack.length > 0) {
                    indentStack.pop();
                    indentLevel = indentStack.length;
                }
            }

            // Apply current indentation
            const indent = ' '.repeat(indentLevel * indentSize);
            formatted.push(indent + trimmed);

            // If line ends with a colon
            if (trimmed.endsWith(':')) {
                indentStack.push('colon');
                indentLevel = indentStack.length;
            }

            // If line ends with opening brace {
            else if (trimmed.endsWith('{')) {
                indentStack.push('brace');
                indentLevel = indentStack.length;
            }
        });

        const newValue = formatted.join('\n');
        setCode(newValue);
    };

    const handleClearOutput = () => {
        setOutput('');
        setError(null);
    };

    return (
        <div
            ref={containerRef}
            className="split-container"
            style={{ gridTemplateColumns: `${leftWidth}% 6px auto` }}
        >
            {/* Code Editor Panel */}
            <div className="panel left-panel">
                <div className="panel-header">
                    <h2>  Editor</h2>
                    <button className="panel-button" onClick={handleFormatCode}>
                        Format Code
                    </button>
                </div>
                <div className="editor-container">
                    <div className="line-numbers">
                        {code.split('\n').map((_, index) => (
                            <div key={index} className="line-number">
                                {index + 1}
                            </div>
                        ))}
                    </div>
                    <textarea
                        spellCheck={false}
                        ref={editorRef}
                        className="code-editor"
                        placeholder="Write your code here."
                        value={code}
                        onChange={(e) => {
                            setUndoStack((prev) => [...prev, code]); // Save current value before change
                            setRedoStack([]); // Clear redo stack on new change
                            setCode(e.target.value);
                        }}

                        onScroll={(e) => {
                            const lineNumbers = e.target.previousSibling;
                            if (lineNumbers) {
                                lineNumbers.scrollTop = e.target.scrollTop;
                            }
                        }}
                        onKeyDown={(e) => {
                            // Undo (Ctrl + Z or Cmd + Z)
                            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                                e.preventDefault();
                                if (undoStack.length > 0) {
                                    const previous = undoStack[undoStack.length - 1];
                                    setUndoStack((prev) => prev.slice(0, -1));
                                    setRedoStack((prev) => [...prev, code]);
                                    setCode(previous);
                                }
                                return;
                            }

                            // Redo (Ctrl + Y or Cmd + Y)
                            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                                e.preventDefault();
                                if (redoStack.length > 0) {
                                    const next = redoStack[redoStack.length - 1];
                                    setRedoStack((prev) => prev.slice(0, -1));
                                    setUndoStack((prev) => [...prev, code]);
                                    setCode(next);
                                }
                                return;
                            }

                            // --- your original logic follows ---
                            const el = e.target;
                            const { selectionStart, selectionEnd, value } = el;

                            const pairs = {
                                '(': ')',
                                '[': ']',
                                '{': '}',
                                '"': '"',
                                "'": "'",
                                '`': '`',
                            };

                            if (e.key === 'Tab') {
                                e.preventDefault();
                                const newValue = value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd);
                                setCode(newValue);
                                setTimeout(() => {
                                    el.selectionStart = el.selectionEnd = selectionStart + 2;
                                }, 0);
                            }

                            if (pairs[e.key]) {
                                e.preventDefault();
                                const insert = pairs[e.key];
                                const newValue =
                                    value.slice(0, selectionStart) + e.key + insert + value.slice(selectionEnd);
                                setCode(newValue);
                                setTimeout(() => {
                                    el.selectionStart = el.selectionEnd = selectionStart + 1;
                                }, 0);
                            }

                            if (e.key === 'Enter') {
                                const before = value.slice(0, selectionStart);
                                const after = value.slice(selectionEnd);
                                const lineStart = before.lastIndexOf('\n') + 1;
                                const currentLine = before.slice(lineStart);
                                const indentMatch = currentLine.match(/^\s*/);
                                const baseIndent = indentMatch ? indentMatch[0] : '';

                                const prevChar = value[selectionStart - 1];
                                const nextChar = value[selectionStart];

                                if (
                                    (prevChar === '{' && nextChar === '}') ||
                                    (prevChar === '[' && nextChar === ']') ||
                                    (prevChar === '(' && nextChar === ')')
                                ) {
                                    e.preventDefault();
                                    const newIndent = baseIndent + '    ';
                                    const newValue = before + '\n' + newIndent + '\n' + baseIndent + after;
                                    setCode(newValue);
                                    setTimeout(() => {
                                        el.selectionStart = el.selectionEnd = before.length + 1 + newIndent.length;
                                    }, 0);
                                    return;
                                }

                                e.preventDefault();
                                const extraIndent = currentLine.trim().endsWith(':') ? '    ' : '';
                                const newValue = before + '\n' + baseIndent + extraIndent + after;
                                setCode(newValue);
                                setTimeout(() => {
                                    el.selectionStart = el.selectionEnd =
                                        before.length + 1 + baseIndent.length + extraIndent.length;
                                }, 0);
                            }
                        }}

                    />
                </div>

            </div>

            {/* Resizer */}
            <div className="resizer" onMouseDown={startDragging} />

            {/* Output Panel */}
            <div className="panel right-panel">
                <div className="panel-header">
                    <h2>  Output</h2>
                    <button className="panel-button" onClick={handleClearOutput}>
                        Clear
                    </button>
                </div>
                <div className="output-box">
                    {isRunning ? (
                        <div className="spinner-container">
                            <div className="spinner" />
                        </div>
                    ) : error ? (
                        <pre style={{ color: 'red' }}>{error}</pre>
                    ) : (
                        <pre>{output}</pre>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Spilit;