const express = require('express')
const path = require('path')
const fetch = require('node-fetch')
const {Server: HttpServer} = require('http')
const Handlebars = require('handlebars')
const hbs = require('express-handlebars')
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access')
const {mail, mailCompra} = require('./mails/mail')
const {sendWpp, wppComprador} = require('./wpp/wpp')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const cookieParser = require('cookie-parser')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const Usuario = require('./daos/userDaos')
const Carrito = require('./daos/carritoDaos')
const {productos} = require('./apiProd')
const logger = require('./logs/reqLogger')
const cluster = require('cluster')
const script = require('bcrypt')
const saltRounds = 10
const routerProductos = require('./routers/productos')
const routerCarrito = require('./routers/carrito')
const { json } = require('express')

const app = express()
const httpServer = new HttpServer(app)
const advancedOptions = { useNewUrlParser: true, useUniFiedTopology: true }

const usuarioDB = new Usuario()
let userDB

const MODO = process.argv[2] || 'fork'


if (MODO === 'cluster' && cluster.isPrimary)
{
  console.log(`Numero de procesadores: ${CPUs}`)
  console.log(`PID master: ${process.pid}`)

  for (let i = 0; i < CPUs; i++){
    cluster.fork()
  }

  cluster.on('exit', (worker) => {
    console.log('worker', worker.process.pid, 'died', new Date().toLocaleString())
    cluster.fork()
  })
}else 
{


app.use(express.urlencoded({extended: true}))
app.use(express.json())




app.use(cookieParser('secreto'))
app.use(session({
  store: MongoStore.create({
    mongoUrl: 'mongodb+srv://elimaq25:3LIZABEth@cluster0.cxssa8p.mongodb.net/?retryWrites=true&w=majority',
    mongoOptions: advancedOptions,
    ttl: 30
  }),
  secret: 'secreto',
  resave: true,
  saveUninitialized: true
}))

app.set('views', './src/views')

app.engine(
  '.hbs',
  hbs.engine({
    defaultLayout: 'main',
    handlebars: allowInsecurePrototypeAccess(Handlebars),
    layoutsDir: './src/views/layouts',
    extname: '.hbs',
  })
)
app.set('view engine', '.hbs')



app.use(passport.initialize())
app.use(passport.session())

passport.use(
    'register',
  
    new LocalStrategy(
      { passReqToCallback: true },
      async (req, username, password, done ) => {
        const {nombre, edad, direccion, telefono, avatar} = req.body
        console.log('entro signup')
        
    
        const carrito = new Carrito()
        try {
          

          script.hash(password, saltRounds, async function (err, hash) {
            const newCarrito = await carrito.newCarrito({productos: " "})
            const carro = newCarrito._id
            await usuarioDB.save({ mail: username, password: hash, nombre: nombre, edad: edad, direccion: direccion, telefono: telefono, avatar: avatar, idC: carro})
            
            mail(username, password, nombre, edad, direccion, telefono, avatar)
        });          
    
          done(null, { mail: username })
        } catch (error) {
        
          return done(null, false, { message: 'Error al registrar el usuario' })
        }
      }
    )
  )

  passport.use(
    'login',
    new LocalStrategy(async (username, password, done) => { 
      let existe
      
      
      
      userDB = await usuarioDB.getByUser(username)
      
      script.compare(password, userDB?.password??'', function(err, result) {
        existe = result
        if (!existe) {  
          return done(null, false)
        } else {
          return done(null, existe)
        }
     });

    })
  )

passport.serializeUser((user, done) => {
    done(null, user)
})
passport.deserializeUser((user, done) => {
    done(null, user)
})



app.use('/api/productos', routerProductos)
app.use('/api/carrito', routerCarrito)

app.get('/registrar', (req, res) => {
    res.render('register')
})

app.get('/login', (req, res) => {
    req.logOut(function(err) {
        if (err) { return next(err); }})
    res.render('login')
})

app.post('/login', passport.authenticate('login', {
    successRedirect: '/main',
    failureRedirect: '/login-error'
})
)

app.post(
    '/register',
    passport.authenticate('register', {
      successRedirect: '/login',
      failureRedirect: '/registrar-error',
    })
)

app.post ('/addProdToCart', async (req, res) => {
  const {id} = req.body
  console.log(id)
  console.log("ACA IDC USER" + userDB.idC)
  carro = userDB.idC
  const carrito = new Carrito()

  await carrito.addProducto(carro, id)
  productos().then(productos => { 
    req.isAuthenticated() ? res.render('datos', {prod: productos}) : res.redirect('/login')
  })
})
      
app.get ('/carrito', async (req, res) => { 
  const carrito = new Carrito()
  carro = userDB.idC
  const productos = await carrito.getProductos(carro)
  req.isAuthenticated() ? res.render('carrito', {prod: productos}) : res.redirect('/login')
})

app.get('/compra', async (req, res) => {
  const carrito = new Carrito()
  carro = userDB.idC
  const productos = await carrito.getProductos(carro)
  const prod = JSON.stringify(productos)
  mailCompra(userDB.nombre, userDB.mail, prod)
  sendWpp(userDB.nombre, userDB.mail, prod)
  wppComprador(userDB.telefono)
  res.redirect('/main')
})

app.get('/login-error', (req, res) => {
    res.render('login-error')
})

app.get('/registrar-error', (req, res) => {
    res.render('registrar-error')
})


app.get('/main', (req, res) => {
    productos().then(productos => { 
        req.isAuthenticated() ? res.render('datos', {prod: productos}) : res.redirect('/login')
    })
   
})

app.get('/logout', (req, res) => {
    req.logOut(function(err) {
        if (err) { return next(err); }})
    res.redirect('/login')
})

app.use((req, res, next) => {
  logger.warn(`Ruta: ${req.path} - Método: ${req.method}`),
  next()
})


}



const PORT = process.env.PORT || 8080
const server = httpServer.listen(PORT, () => console.log(`Servidor en ${PORT}`))
server.on('error', (error) => console.log(`Error en el servidor ${error}`))