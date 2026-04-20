import React, { useState } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');

    const createNewRoom = (e) => {
        e.preventDefault();
        const id = uuidV4();
        setRoomId(id);
        toast.success('Generated a new room ID');
    };

    const joinRoom = () => {
        if (!roomId || !username) {
            toast.error('Room ID & username is required');
            return;
        }

        // Redirect
        navigate(`/editor/${roomId}`, {
            state: {
                username,
            },
        });
    };

    const handleInputEnter = (e) => {
        if (e.code === 'Enter') {
            joinRoom();
        }
    };

    return (
        <div className="homePageWrapper">
            <div className="formWrapper glass">
                <div className="mainLabel">
                    <div className="logoIcon" style={{fontSize: '2.5rem'}}>⚡</div>
                    <span>CodeSync Pro</span>
                    <p style={{fontSize: '0.9rem', color: '#8b949e', fontWeight: '400', marginTop: '5px'}}>
                        Real-time collaborative workspace
                    </p>
                </div>
                <div className="inputGroup">
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="ROOM ID"
                        onChange={(e) => setRoomId(e.target.value)}
                        value={roomId}
                        onKeyUp={handleInputEnter}
                    />
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="USERNAME"
                        onChange={(e) => setUsername(e.target.value)}
                        value={username}
                        onKeyUp={handleInputEnter}
                    />
                    <button className="btn btn-primary" onClick={joinRoom} style={{width: '100%', height: '45px'}}>
                        Join Workspace
                    </button>
                    <span className="createInfo">
                        If you don't have an invite then create &nbsp;
                        <button
                            onClick={createNewRoom}
                            className="createNewBtn"
                            style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', textDecoration: 'underline' }}
                        >
                            new room
                        </button>
                    </span>
                </div>
            </div>

            <footer style={{position: 'absolute', bottom: '20px', color: '#484f58', fontSize: '0.8rem'}}>
                Built for professional collaborative engineering
            </footer>
        </div>
    );
};

export default Home;
