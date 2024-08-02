import express from 'express'
import { Server } from 'socket.io'
import { createServer } from 'http'
import cors from 'cors'



const port = process.env.PORT || 3000
const app = express()
const server = createServer(app)
let usuarios = []
app.use(cors())
const io = new Server(server, {
    cors: {
        // origin: "http://localhost",
        origin: "*"
    }
})

io.on('connection', (socket) => {
    console.log('Un usuario conectado'+socket.id)
    socket.on('newRegister', (datos) => {
        login(datos.user, datos.password).then(data => {
            data = JSON.parse(data)
            if (data.status === "OK") {
                var loginData = {
                    'status': data.status,
                    'user': data.newUser,
                    'msg': 'Hola de nuevo ' + data.newUser + '.'
                }
                if (!usuarios.some(user => user.user == data.newUser)) {
                    const OUser = {
                        user: data.newUser,
                        socketId: socket.id
                    }
                    usuarios.push(OUser)
                }
                socket.emit('Welcome', loginData)
                socket.broadcast.emit('NewUserConnected', data.newUser + ', Se a conectado.')
            } else if (data.status == 'FAILURE') {
                var loginData = {
                    'status': data.status,
                    'user': data.newUser,
                    'msg': 'El usuario "' + data.newUser + '" ya existe pero la contraseña es incorrecta.'
                }
                socket.emit('Welcome', loginData)
            } else if (data.status === "NOT_FOUND") {
                guardarUsuarioEnServidor(datos.user, datos.password)
                    .then(data => {
                        data = JSON.parse(data)
                        if (data.status === "ok") {
                            if (validUser)
                                var newDatos = {
                                    'status': 'REGISTER',
                                    'user': data.newUser,
                                    'msg': '!Hola¡ ' + data.newUser + '. \n Bienvenido.'
                                }
                            OUser = {
                                user: data.newUser,
                                socketId: socket.id
                            }
                            usuarios.push(OUser)
                            console.log(usuarios)
                            socket.emit('Welcome', newDatos)
                            socket.broadcast.emit('NewUserConnected', data.newUser + ', Se a conectado.')
                            const OUser = [{
                                user: data.newUser,
                                socketId: socket.id
                            }]
                            usuarios.push(OUser)
                        } else {
                            console.error('hubo un error: ' + data.msg)
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error)
                    })
            }
        })
    })

    socket.on('login', (user) => {
        if (validUserOnline(usuarios, user)) {
            if (validUser(usuarios, user, socket.id)) {
                var data = {
                    'user': user,
                    'status': 'SessionFailure',
                }
                socket.emit('DuplicateSession', data)
            }
            else {
                var data = {
                    'user': user,
                    'status': 'OK',
                }
                socket.emit('DuplicateSession', data)
            }
        } else {
            const OUser = {
                user: user,
                socketId: socket.id
            }
            usuarios.push(OUser)
            var data = {
                'user': user,
                'status': 'OK',
            }
            socket.emit('DuplicateSession', data)
        }
        socket.broadcast.emit('NewUserConnected', user + ', Se a conectado.')
    })

    socket.on('newMessage', (msg) => {
        var user = msg.user
        if (!usuarios.some(users => users.user == user)) {
            const OUser = {
                user: user,
                socketId: socket.id
            }
            usuarios.push(OUser)
        }
        if (validUser(usuarios, user, socket.id)) {
            var data = {
                'user': user,
                'status': 'SessionFailure',
            }
            socket.emit('msg-DuplicateSession', data)
        }
        else {
            var data = {
                'user': user,
                'status': 'OK',
            }
            socket.emit('msg-DuplicateSession', data)
            socket.emit('mensaje propio', msg.text)
            socket.broadcast.emit('mensaje nuevo', msg)
        }
    })

    socket.on('logout', () => {
        usuarios = usuarios.filter(u => u.socketId !== socket.id)
    })

    socket.on('disconnect', () => {
        usuarios = usuarios.filter(u => u.socketId !== socket.id)
    })
})

function validUserOnline(usuarios, user) {
    for (let i = 0; i < usuarios.length; i++) {
        if (usuarios[i].user === user) {
            return true
        }
    }
    return false
}

function validUser(usuarios, user, socketId) {
    for (let i = 0; i < usuarios.length; i++) {
        if (usuarios[i].user === user && usuarios[i].socketId === socketId) {
            return false
        }
    }
    return true
}

function login(nameUser, passUser) {
    const formData = new FormData()

    formData.append('nameUser', nameUser)
    formData.append('passUser', passUser)

    return new Promise((resolve, reject) => {
        fetch('https://michat-production-a5c7.up.railway.app/APIs/verifyExistingUser.php', {
            method: 'POST',
            body: formData
        })
            .then(response => response.text())
            .then(data => {
                resolve(data)
            })
            .catch(error => {
                console.error('Error al enviar la solicitud Fetch', error)
                reject(error)
            })
    })
}


function guardarUsuarioEnServidor(nameUser, passUser) {
    const formData = new FormData()
    formData.append('nameUser', nameUser)
    formData.append('passUser', passUser)

    return new Promise((resolve, reject) => {
        fetch('https://michat-production-a5c7.up.railway.app/APIs/saveUser.php', {
            method: 'POST',
            body: formData
        })
            .then(response => response.text())
            .then(data => {
                resolve(data)
            })
            .catch(error => {
                console.error('Error al enviar la solicitud Fetch', error)
                reject(error)
            })
    })
}

server.listen(port, () => {
    console.log('Servidor escuchando en http://localhost:' + port)
})