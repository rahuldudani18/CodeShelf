import { useRef, useState } from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/theme-twilight';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/mode-csharp';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-ruby';
import 'ace-builds/src-noconflict/mode-rust';
import 'ace-builds/src-noconflict/mode-swift';
import './Spilit.css';
import { useCode } from '../../../context/CodeContext';

const languageModeMap = {
    c: 'c_cpp',
    'c++': 'c_cpp',
    'c#': 'csharp',
    javascript: 'javascript',
    java: 'java',
    python: 'python',
    ruby: 'ruby',
    rust: 'rust',
    swift: 'swift',
    go: 'go',
};

const Spilit = () => {
    const containerRef = useRef(null);
    const [leftWidth, setLeftWidth] = useState(60);
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    const { code, setCode, output, error, isRunning, setOutput, setError, language } = useCode();

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

    const handleClearOutput = () => {
        setOutput('');
        setError(null);
    };

    const handleEditorChange = (newValue) => {
        setUndoStack((prev) => [...prev, code]);
        setRedoStack([]);
        setCode(newValue);
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
                </div>
                <div className="editor-container">
                    <AceEditor
                        mode={languageModeMap[language] || 'javascript'}
                        theme="twilight"
                        name="ace-editor"
                        width="100%"
                        height="100%"
                        fontSize={14}
                        showPrintMargin={false}
                        showGutter={true}
                        highlightActiveLine={true}
                        value={code}
                        onChange={handleEditorChange}
                        setOptions={{
                            enableLiveAutocompletion: false,  // disable live autocomplete
                            tabSize: 4,
                            useWorker: false,
                        }}
                        editorProps={{ $blockScrolling: true }}
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
