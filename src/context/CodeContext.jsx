import { createContext, useContext, useState } from "react";

const CodeContext = createContext();

export const CodeProvider = ({ children }) => {
    const [language, setLanguage] = useState("javascript");
    const [code, setCode] = useState("");
    const [output, setOutput] = useState("");
    const [error, setError] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

    const LANGUAGE_CONFIG = {
        javascript: { language: "javascript", version: "18.15.0" },
        python: { language: "python", version: "3.10.0" },
        java: { language: "java", version: "15.0.2" },
        c: { language: "c", version: "10.2.0" },
        cpp: { language: "cpp", version: "10.2.0" },
        csharp: { language: "csharp", version: "6.12.0" },
        ruby: { language: "ruby", version: "3.0.0" },
        rust: { language: "rust", version: "1.72.0" },
        swift: { language: "swift", version: "5.3.3" },
        go: { language: "go", version: "1.20.0" },
    };

    const runCode = async () => {
        if (!code.trim()) {
            setError("Please enter some code");
            setOutput("");
            return;
        }

        setError(null);
        setIsRunning(true);
        setOutput("");

        try {
            const runtime = LANGUAGE_CONFIG[language.toLowerCase()];

            if (!runtime) {
                setError("Unsupported language selected.");
                setIsRunning(false);
                return;
            }

            const res = await fetch("https://emkc.org/api/v2/piston/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language: runtime.language,
                    version: runtime.version,
                    files: [{ content: code }],
                }),
            });

            const data = await res.json();

            if (data.run?.code !== 0) {
                setError(data.run?.stderr || data.run?.output || "Execution error");
                setOutput("");
            } else {
                setOutput(data.run?.output.trim());
            }
        } catch (err) {
            setError("Error executing code");
            setOutput("");
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <CodeContext.Provider
            value={{
                language,
                setLanguage,
                code,
                setCode,
                output,
                setOutput,
                error,
                setError,
                isRunning,
                runCode,
            }}
        >
            {children}
        </CodeContext.Provider>
    );
};

export const useCode = () => useContext(CodeContext);