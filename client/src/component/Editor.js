import React, { useEffect, useRef } from "react";
import CodeMirror from "codemirror";

// Modes
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/python/python";
import "codemirror/mode/xml/xml";
import "codemirror/mode/css/css";
import "codemirror/mode/clike/clike";

// Addons
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/hint/show-hint";
import "codemirror/addon/hint/javascript-hint";
import "codemirror/addon/hint/css-hint";
import "codemirror/addon/hint/xml-hint";
import "codemirror/addon/hint/html-hint";

// Styles
import "codemirror/addon/hint/show-hint.css";
import "codemirror/theme/dracula.css";
import "codemirror/lib/codemirror.css";

const getMode = (fileName) => {
    if (fileName.endsWith('.js')) return { name: 'javascript', json: true };
    if (fileName.endsWith('.py')) return 'python';
    if (fileName.endsWith('.html')) return 'xml';
    if (fileName.endsWith('.css')) return 'css';
    if (fileName.endsWith('.cpp') || fileName.endsWith('.java')) return 'text/x-c++src';
    return 'javascript';
};

function Editor({ socketRef, roomId, onCodeChange, fileName, code }) {
  const editorRef = useRef(null);
  const timeoutRef = useRef(null);
  const cursorMarkers = useRef({});

  const propsRef = useRef({ onCodeChange, fileName, socketRef, roomId });

  useEffect(() => {
    propsRef.current = { onCodeChange, fileName, socketRef, roomId };
  }, [onCodeChange, fileName, socketRef, roomId]);

  // Initialize CodeMirror - only once on mount
  useEffect(() => {
    const editorElement = document.getElementById("realtimeEditor");
    if (!editorElement || editorRef.current) return;

    editorRef.current = CodeMirror.fromTextArea(editorElement, {
      mode: getMode(fileName),
      theme: "dracula",
      autoCloseTags: true,
      autoCloseBrackets: true,
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      lineWrapping: true,
      extraKeys: { "Ctrl-Space": "autocomplete" },
    });

    editorRef.current.on("change", (instance, changes) => {
      const { origin } = changes;
      const currentCode = instance.getValue();
      const { onCodeChange, fileName, socketRef, roomId } = propsRef.current;
      
      if (onCodeChange) onCodeChange(currentCode);
      
      if (origin !== "setValue") {
        const cursor = instance.getCursor();
        const line = instance.getLine(cursor.line);
        const lastTwoChars = line.slice(Math.max(0, cursor.ch - 2), cursor.ch);
        
        if (origin === "+input" && (lastTwoChars.match(/[a-zA-Z]/) || lastTwoChars.includes('.'))) {
           instance.showHint({ completeSingle: false });
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (socketRef.current) {
            socketRef.current.emit('code-change', {
              roomId,
              code: currentCode,
              fileName,
            });
          }
        }, 50);
      }
    });

    editorRef.current.on("cursorActivity", (instance) => {
      const cursor = instance.getCursor();
      const { socketRef, roomId } = propsRef.current;
      if (socketRef.current) {
         socketRef.current.emit('cursor-activity', { roomId, cursor });
      }
    });

    return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (editorRef.current) {
            editorRef.current.toTextArea();
            editorRef.current = null;
        }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Static init

  // Update mode when fileName changes
  useEffect(() => {
    if (editorRef.current) {
        editorRef.current.setOption('mode', getMode(fileName));
    }
  }, [fileName]);

  // Handle Socket Events
  useEffect(() => {
    const socket = socketRef.current;
    if (socket) {
      const handleCodeChange = ({ code: incomingCode, fileName: incomingFileName }) => {
        if (incomingFileName === fileName && incomingCode !== null) {
          const currentContent = editorRef.current.getValue();
          if (currentContent !== incomingCode) {
            editorRef.current.setValue(incomingCode);
          }
        }
      };

      const handleCursorActivity = ({ cursor, socketId, username }) => {
          if (cursorMarkers.current[socketId]) cursorMarkers.current[socketId].clear();
          
          const cursorElement = document.createElement('span');
          cursorElement.className = 'remote-cursor';
          cursorElement.style.borderLeft = '2px solid var(--primary)';
          cursorElement.style.position = 'relative';
          
          const nameTag = document.createElement('div');
          nameTag.className = 'cursor-nametag';
          nameTag.innerText = username || 'Guest';
          cursorElement.appendChild(nameTag);

          cursorMarkers.current[socketId] = editorRef.current.setBookmark(cursor, { widget: cursorElement });
      };

      socket.on('code-change', handleCodeChange);
      socket.on('cursor-activity', handleCursorActivity);

      return () => {
        socket.off('code-change', handleCodeChange);
        socket.off('cursor-activity', handleCursorActivity);
      };
    }
  }, [socketRef, fileName]);

  // Handle external code updates (e.g. from parent state)
  useEffect(() => {
    if (editorRef.current && code !== undefined) {
        if (editorRef.current.getValue() !== code) {
            editorRef.current.setValue(code);
        }
    }
  }, [code]);

  return <textarea id="realtimeEditor"></textarea>;
}

export default Editor;