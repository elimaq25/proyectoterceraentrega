const admin = require('firebase-admin')
const config= require('./db/segundaentrega-be885-firebase-adminsdk-9bc9r-f095567c03.json')
const Producto = require('./productoDaos') 


const Productos = new Producto()

class Carrito {
    constructor() {
        admin.initializeApp({
            credential: admin.credential.cert(config),
            databaseURL: 'https://segundaentrega-be885.firebaseio.com'
        })
    }

    async newCarrito() {
        const db = admin.firestore()
        const query = db.collection('carritos')
        let time = new Date()
        try {
            const doc = query.doc()
            const carrito = await doc.create({
                timestamp: time.toString(),
                productos: []
            })
            return carrito
        }catch (error){
            logger.error(error)
        }
    }

    async getCarritoById(idC) {
        try {
            const db = admin.firestore()
            const query = db.collection('carritos')
            const doc = query.doc(String(idC))
            const encontrado = await doc.get()
            return encontrado.data()
    
        } catch (error){
            logger.error(error)
        }
    }

    async deleteCarritoById(idC) {
        try {
            const db = admin.firestore()
            const query = db.collection('carritos')
            const doc = query.doc(String(idC))
            await doc.delete()

    
        } catch (error){
            logger.error(error)
        }
    }


    async deleteProductoDeCarrito(idCarrito, idProducto, idEnCarrito) {
        try {
            function random(min, max) {
                return Math.floor((Math.random() * (max - min + 1)) + min);
            }
            
            let productoAtlas = await Productos.getById(idProducto)


            const db = admin.firestore()
            const query = db.collection('carritos')
            const doc = query.doc(idCarrito)

            productoAtlas.idC = idEnCarrito

            const item = await doc.update({
                productos: admin.firestore.FieldValue.arrayRemove(String(productoAtlas))
            })

        } catch (error){
            logger.error(error)
        }
    }

    async agregarProducto(idCarrito, idProducto) {
        try {
            function random(min, max) {
                return Math.floor((Math.random() * (max - min + 1)) + min);
            }
            
            let productoAtlas = await Productos.getById(idProducto)


            const db = admin.firestore()
            const query = db.collection('carritos')
            const doc = query.doc(idCarrito)

            let idrand = random(1,10000)

            productoAtlas.idC = String(idrand)

            const item = await doc.update({
                productos: admin.firestore.FieldValue.arrayUnion(String(productoAtlas))
            })

        } catch (error){
            logger.error(error)
        }
    }
}

module.exports = Carrito