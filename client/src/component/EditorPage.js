import React, { useEffect, useRef, useState, useCallback } from 'react'
import Client from './Client'
import Editor from './Editor'
import { initSocket } from '../socket'
import { useNavigate, useLocation, useParams, Navigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { JUDGE0_LANGUAGE_MAP } from '../IDEUtils'

// --- ICONS (SVG Helpers) ---
const Icons = {
    Files: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8z"/><polyline points="12 2 12 8 22 8"/></svg>,
    Chat: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    Play: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
};

// --- HELPERS ---
const toBase64 = (str) => {
    try { return btoa(unescape(encodeURIComponent(str))); } catch (e) { return btoa(str); }
};
const fromBase64 = (str) => {
    try { return decodeURIComponent(escape(atob(str))); } catch (e) { return atob(str); }
};

// --- CUSTOM MODAL ---
const Modal = ({ isOpen, title, children, onClose, onConfirm, confirmText = "Confirm" }) => {
    if (!isOpen) return null;
    return (
        <div className="modalOverlay" onClick={onClose}>
            <div className="modalContent glass" onClick={e => e.stopPropagation()}>
                <div style={{padding: '15px 20px', borderBottom: '1px solid var(--border)'}}>
                    <h3 style={{margin: 0, fontSize: '1rem'}}>{title}</h3>
                </div>
                <div style={{padding: '20px'}}>{children}</div>
                <div style={{padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: 'rgba(0,0,0,0.1)'}}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={onConfirm}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS ---
const ActivityBar = ({ activeTab, onTabChange }) => (
    <div className="activityBar">
        <div className={`activityIcon ${activeTab === 'explorer' ? 'active' : ''}`} onClick={() => onTabChange('explorer')} title="Explorer"><Icons.Files /></div>
        <div className={`activityIcon ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => onTabChange('chat')} title="Collaborative Chat"><Icons.Chat /></div>
        <div className={`activityIcon ${activeTab === 'search' ? 'active' : ''}`} onClick={() => onTabChange('search')} title="Global Search"><Icons.Search /></div>
        <div className="activityIcon" style={{marginTop: 'auto'}} onClick={() => onTabChange('settings')} title="Settings"><Icons.Settings /></div>
    </div>
);

const TabList = ({ openFiles, activeFile, onTabClick, onTabClose }) => (
    <div className="tabList">
        {openFiles.map(file => (
            <div key={file} className={`tabItem ${activeFile === file ? 'active' : ''}`} onClick={() => onTabClick(file)}>
                <span>{file}</span>
                <span className="tabClose" onClick={(e) => { e.stopPropagation(); onTabClose(file); }}>×</span>
            </div>
        ))}
    </div>
);

const StatusBar = ({ roomId, activeFile, clients }) => (
    <div className="statusBar">
        <div className="statusLeft">
            <span>✨ CodeSync Connected</span>
            <span>Room: {roomId?.slice(0, 8)}...</span>
        </div>
        <div className="statusRight">
            <span>{activeFile}</span>
            <span>{clients.length} Collaborative Users</span>
        </div>
    </div>
);

// --- MAIN IDE ---
function EditorPage() {
  const DEFAULT_CODE = {
      'index.html': '<h1>Welcome to CodeSync Pro</h1>\n<p>Start collaborating in real-time.</p>',
      'style.css': 'body { background: #0d1117; color: #58a6ff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; }'
  };

  const [clients, setClient] = useState([])
  const [files, setFiles] = useState(DEFAULT_CODE)
  const [openFiles, setOpenFiles] = useState(['index.html', 'style.css'])
  const [activeFile, setActiveFile] = useState('index.html')
  const [activeSidebarTab, setActiveSidebarTab] = useState('explorer')
  const [messages, setMessages] = useState([])
  const [terminalOutput, setTerminalOutput] = useState(null)
  const [isExecuting, setIsExecuting] = useState(false)

  // Modal State
  const [modalType, setModalType] = useState(null); 
  const [newFileName, setNewFileName] = useState('');
  const [fileToDelete, setFileToDelete] = useState(null);
  
  const socketRef = useRef(null)
  const filesRef = useRef(files)
  const location = useLocation()
  const { roomId } = useParams()
  const navigate = useNavigate()

  useEffect(() => { filesRef.current = files; }, [files]);

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket()
      socketRef.current.on('connect_error', () => navigate("/")) 
      socketRef.current.emit('join', { roomId, username: location.state?.username })

      socketRef.current.on('joined', ({ clients, username, socketId }) => {
        if (username !== location.state?.username) {
          toast.success(`${username} joined`)
          socketRef.current.emit('sync-code', { files: filesRef.current, socketId })
        }
        setClient(clients)
      })

      socketRef.current.on('sync-code', ({ files }) => {
          setFiles(files);
          setOpenFiles(Object.keys(files).slice(0, 5)); // Sync open tabs
      })
      socketRef.current.on('code-change', ({ code, fileName }) => setFiles(prev => ({ ...prev, [fileName]: code })))
      socketRef.current.on('file-created', ({ fileName }) => {
          setFiles(prev => ({ ...prev, [fileName]: '' }));
          setOpenFiles(prev => [...new Set([...prev, fileName])]);
      })
      socketRef.current.on('file-deleted', ({ fileName }) => {
        setFiles(prev => { const nf = { ...prev }; delete nf[fileName]; return nf; });
        setOpenFiles(prev => prev.filter(f => f !== fileName));
        if (activeFile === fileName) setActiveFile('index.html');
      })
      socketRef.current.on('receive-message', (data) => setMessages(prev => [...prev, data]))
      socketRef.current.on("disconnected", ({socketId}) => setClient(prev => prev.filter(c => c.socketId !== socketId)))
    }
    init()
    return () => { if (socketRef.current) socketRef.current.disconnect(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, location.state?.username]); 

  const onCodeChange = useCallback((code) => setFiles(prev => ({ ...prev, [activeFile]: code })), [activeFile]);

  const handleCreateFile = () => {
    if (!newFileName) return;
    if (files[newFileName]) return toast.error("Exists already");
    socketRef.current.emit('file-created', { roomId, fileName: newFileName });
    setFiles(prev => ({ ...prev, [newFileName]: '' }));
    setOpenFiles(prev => [...new Set([...prev, newFileName])]);
    setActiveFile(newFileName);
    setModalType(null);
    setNewFileName('');
  };

  const handleTabClose = (fileName) => {
      const remaining = openFiles.filter(f => f !== fileName);
      setOpenFiles(remaining);
      if (activeFile === fileName && remaining.length > 0) {
          setActiveFile(remaining[remaining.length - 1]);
      } else if (remaining.length === 0) {
          setActiveFile(null);
      }
  };

  const runCode = async () => {
    const extension = activeFile.split('.').pop();
    const langId = JUDGE0_LANGUAGE_MAP[extension];
    if (!langId) return toast.error("Language not supported for execution");
    setIsExecuting(true);
    setTerminalOutput({ content: "Submitting to engine...", status: "Pending" });

    try {
        const response = await fetch('https://ce.judge0.com/submissions?base64_encoded=true', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                source_code: toBase64(files[activeFile] || ""), 
                language_id: langId, 
                stdin: toBase64("") 
            })
        });
        const data = await response.json();
        const token = data.token;
        if (!token) throw new Error(data.message || "Failed to get execution token");

        const checkStatus = async () => {
            const res = await fetch(`https://ce.judge0.com/submissions/${token}?base64_encoded=true`);
            const resData = await res.json();
            const sid = resData.status?.id;

            if (sid === 1 || sid === 2) {
                setTerminalOutput({ content: `Processing: ${resData.status.description}...`, status: resData.status.description });
                setTimeout(checkStatus, 1000);
            } else {
                const stdout = resData.stdout ? fromBase64(resData.stdout) : "";
                const stderr = resData.stderr ? fromBase64(resData.stderr) : "";
                const c_out = resData.compile_output ? fromBase64(resData.compile_output) : "";
                setTerminalOutput({
                    content: stdout || stderr || c_out || "Execution finished with no output",
                    isError: sid !== 3,
                    status: resData.status?.description
                });
                setIsExecuting(false);
            }
        };
        checkStatus();
    } catch (e) {
        setTerminalOutput({ content: "Execution failed due to error", isError: true });
        setIsExecuting(false);
    }
  };

  if (!location.state) return <Navigate to="/" />

  const ChatPanelContent = () => {
      const [msg, setMsg] = useState("");
      return (
          <div className="workspaceChat">
              <div className="explorerHeader"><span>Collab Chat</span></div>
              <div style={{flex: 1, overflowY: 'auto', padding: '10px 0'}}>
                  {messages.map((m, i) => (
                      <div key={i} style={{marginBottom: '10px', textAlign: m.username === location.state.username ? 'right' : 'left'}}>
                          <div style={{fontSize: '0.65rem', opacity: 0.6}}>{m.username}</div>
                          <div style={{display: 'inline-block', background: m.username === location.state.username ? 'var(--primary)' : 'var(--bg-lighter)', color: m.username === location.state.username ? '#000' : '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem'}}>{m.message}</div>
                      </div>
                  ))}
              </div>
              <input className="inputBox" style={{marginTop: '10px'}} value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && (socketRef.current.emit('send-message', { roomId, message: msg, username: location.state.username }), setMsg(""))} placeholder="Type and hit Enter..." />
          </div>
      );
  }

  return (
    <div className='mainWrapper'>
        <ActivityBar activeTab={activeSidebarTab} onTabChange={setActiveSidebarTab} />
        
        <header className="topHeader">
            <div className="headerLeft">
                <div style={{color: 'var(--primary)', fontWeight: 'bold', fontSize: '1rem'}}>CodeSync Pro</div>
                <div style={{fontSize: '0.75rem', opacity: 0.6}}>v2.0 Beta</div>
            </div>
            <div className="headerRight">
                <button className="btn btn-primary" onClick={runCode} disabled={isExecuting}><Icons.Play /> Run</button>
                <button className="btn btn-outline" onClick={() => { navigator.clipboard.writeText(roomId); toast.success("ID Copied"); }}>Invite</button>
                <button className="btn btn-danger" onClick={() => navigate('/')}>Exit</button>
            </div>
        </header>

        <aside className="aside">
            <div className="asideInner">
                {activeSidebarTab === 'explorer' && (
                    <>
                        <div className="explorerHeader">
                            <span>Project Files</span>
                            <button className="btn-icon" style={{background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}} onClick={() => setModalType('create')}>+</button>
                        </div>
                        {Object.keys(files).map(f => (
                            <div key={f} className={`fileItem ${activeFile === f ? 'active' : ''}`} onClick={() => { setActiveFile(f); setOpenFiles(p => [...new Set([...p, f])]); }}>
                                <span>{f}</span>
                                {f !== 'index.html' && <button className="delBtn" onClick={(e) => { e.stopPropagation(); setFileToDelete(f); setModalType('delete'); }}>×</button>}
                            </div>
                        ))}
                        <div style={{marginTop: '40px'}} className="explorerHeader"><span>Active Now</span></div>
                        <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                            {clients.map(c => <Client key={c.socketId} username={c.username} />)}
                        </div>
                    </>
                )}
                {activeSidebarTab === 'chat' && <ChatPanelContent />}
                {activeSidebarTab === 'search' && <div className="explorerHeader"><span>Search is coming soon...</span></div>}
                {activeSidebarTab === 'settings' && <div className="explorerHeader"><span>IDE Customization...</span></div>}
            </div>
        </aside>

        <main className="workspaceArea">
            <TabList openFiles={openFiles} activeFile={activeFile} onTabClick={setActiveFile} onTabClose={handleTabClose} />
            <div className="editorContainer">
                {activeFile && <Editor socketRef={socketRef} roomId={roomId} fileName={activeFile} code={files[activeFile]} onCodeChange={onCodeChange} />}
                {terminalOutput && (
                    <div className="terminalPanel">
                        <div className="terminalHeader">
                            <span>TERMINAL: {terminalOutput.status}</span>
                            <button className="btn-icon" style={{background: 'none', border: 'none', color: '#fff', cursor: 'pointer'}} onClick={() => setTerminalOutput(null)}>×</button>
                        </div>
                        <div style={{flex: 1, padding: '10px', fontFamily: 'monospace', fontSize: '0.8rem', overflowY: 'auto'}}>
                            <pre style={{color: terminalOutput.isError ? 'var(--error)' : 'var(--text-main)'}}>{terminalOutput.content}</pre>
                        </div>
                    </div>
                )}
            </div>
        </main>

        <StatusBar roomId={roomId} activeFile={activeFile} clients={clients} />

        <Modal isOpen={modalType === 'create'} title="New File" onClose={() => setModalType(null)} onConfirm={handleCreateFile} confirmText="Create">
            <input className="inputBox" placeholder="filename.js" value={newFileName} onChange={e => setNewFileName(e.target.value)} autoFocus />
        </Modal>

        <Modal isOpen={modalType === 'delete'} title="Delete File" onClose={() => setModalType(null)} onConfirm={() => { socketRef.current.emit('file-deleted', { roomId, fileName: fileToDelete }); setModalType(null); }} confirmText="Delete">
            <p style={{fontSize: '0.9rem'}}>Permanently delete <b>{fileToDelete}</b>?</p>
        </Modal>
    </div>
  )
}

export default EditorPage
