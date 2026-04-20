const express = require("express")
const app = express()
const http = require("http")
const { Server } = require("socket.io")

const server = http.createServer(app)
const io = new Server(server)

const userSocketMap = {}

const getAllConnectedClients = (roomId) => {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            }
        }
    )
}

io.on('connection', (socket) => {
    socket.on('join', ({roomId, username}) =>{
        userSocketMap[socket.id] = username
        socket.join(roomId)
        const clients = getAllConnectedClients(roomId)
        
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit("joined",{
                clients,
                username,
                socketId: socket.id,
            })
        })
    })

    // Code and File Changes
    socket.on('code-change', ({ roomId, code, fileName }) => {
        socket.in(roomId).emit("code-change", { code, fileName })
    })

    socket.on("sync-code", ({ socketId, files }) => {
        io.to(socketId).emit("sync-code", { files })
    })

    socket.on('file-created', ({ roomId, fileName }) => {
        socket.in(roomId).emit('file-created', { fileName })
    })

    socket.on('file-deleted', ({ roomId, fileName }) => {
        socket.in(roomId).emit('file-deleted', { fileName })
    })

    // Chat
    socket.on('send-message', ({ roomId, message, username }) => {
        io.to(roomId).emit('receive-message', {
            message,
            username,
            id: Date.now() + Math.random(),
        })
    })

    // Cursor Activity
    socket.on('cursor-activity', ({ roomId, cursor, username }) => {
        socket.in(roomId).emit('cursor-activity', { cursor, username, socketId: socket.id })
    })

    socket.on('disconnecting',() =>{
        const rooms = [...socket.rooms]
        rooms.forEach((roomId) =>{
            socket.in(roomId).emit("disconnected", {
                socketId: socket.id,
                username: userSocketMap[socket.id],    
            })
    
        })
        delete userSocketMap[socket.id]
        socket.leave()
    }) 
})

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("server is running"))