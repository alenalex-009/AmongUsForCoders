import { useEffect, useState } from 'react';
import { socket } from './socket';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Meeting from './pages/Meeting';
import Result from './pages/Result';
import Auth from './components/Auth';

function App() {
  const [room, setRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('currentUser') || null);

  const handleLogin = (username) => {
    localStorage.setItem('currentUser', username);
    setCurrentUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
  };

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }
    function onRoomUpdate(updatedRoom) {
      setRoom(updatedRoom);
      setErrorMsg('');
    }
    function onJoinError({ message }) {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(''), 5000);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_update', onRoomUpdate);
    socket.on('join_error', onJoinError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_update', onRoomUpdate);
      socket.off('join_error', onJoinError);
    };
  }, []);

  if (!room) {
    return (
      <div className="h-screen flex flex-col relative z-0 bg-transparent">
        {errorMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-danger-600 text-white px-6 py-2 rounded shadow-2xl font-black tracking-widest border border-white/20 animate-bounce">
            {errorMsg}
          </div>
        )}
        {!currentUser ? <Auth onLogin={handleLogin} /> : <Lobby socket={socket} currentUser={currentUser} onLogout={handleLogout} />}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col text-black font-sans p-2 sm:p-6 overflow-hidden relative z-0">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-3xl font-black tracking-widest uppercase text-white drop-shadow-[3px_3px_0_rgba(0,0,0,1)]">Code Deception Arena</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs sm:text-sm text-black bg-white px-4 py-2 rounded-xl border-[4px] border-black font-black uppercase shadow-[4px_4px_0_rgba(0,0,0,1)]">Room: {room.id}</span>
          <span className={`w-6 h-6 rounded-full border-[4px] border-black shadow-[2px_2px_0_rgba(0,0,0,1)] ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        </div>
      </div>
      
      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col min-h-0 panel-glass rounded-xl overflow-hidden relative">
        {room.gameState === 'lobby' && <Lobby room={room} socket={socket} />}
        {room.gameState === 'playing' && <Game room={room} socket={socket} />}
        {(room.gameState === 'meeting' || room.gameState === 'voting') && <Meeting room={room} socket={socket} />}
        {room.gameState === 'result' && <Result room={room} socket={socket} />}
      </div>
    </div>
  );
}

export default App;
