import { TicketService } from '../../services/ticket.services.js';
import { cartModel } from '../models/cart.model.js';
import ProductManager from './productManager.js';
import mongoose from 'mongoose';

const productMng = new ProductManager();
const ticketService = new TicketService();

export class CartManager {
    cartsModel
    constructor () {
        this.cartsModel = cartModel;
        this.ticketService = new TicketService;
    }
    // Metodos
    async getCarts() {
        const listaCarts = await this.cartsModel.find();
        return listaCarts;
    }
    async addCart() {
        const cart = await this.cartsModel.create([{}]);
        return cart[0];
    }
    async getCartById(idCart) {
        const cartsFiltrado = await this.cartsModel.find({_id : idCart}).populate("products.product");
        return cartsFiltrado;
    }
    async deleteProduct(idCart, idProducto) {
        const cartsFiltrado = await this.cartsModel.findOne({_id : idCart});
        if(!cartsFiltrado) {
            throw new Error;
        }
        const productoPorBorrar = cartsFiltrado.products.find(e => e.product.toString() === idProducto.toString())
        if (!productoPorBorrar) {
            throw new Error;
        }
        cartsFiltrado.products.pull(productoPorBorrar);
        const salvar = await cartsFiltrado.save()
        return salvar;
    }
    async emptyCart(idCart) {
        const cartsFiltrado = await this.cartsModel.findOne({_id : idCart});
        if(!cartsFiltrado) {
            throw new Error;
        }
        const vaciar = await this.cartsModel.updateOne({_id : idCart},{$set:{products:[]}})
        return vaciar;
    }
    async updateProduct(idCart, idProducto, quantity) {
        const cartsFiltrado = await this.cartsModel.findOne({_id : idCart});
        const productoPorBorrar = cartsFiltrado.products.find(e => e.product.toString() === idProducto)
        if(!cartsFiltrado || !productoPorBorrar) {
            throw new Error;
        } else if (!isNaN(parseInt(quantity))) {
            const cartUpdated = await this.cartsModel.updateOne({_id : idCart , "products.product" : idProducto},{$set:{"products.$.quantity":quantity}})
            return cartUpdated;
        } else {
            throw new Error;
        }
    }
    async updateProducts(idCart, newProducts) {
        const cartsFiltrado = await this.cartsModel.findOne({_id : idCart});
        if(!cartsFiltrado){
            throw new Error;
        } else if (cartsFiltrado.products.length === 0) {
            const productosActualizados = await this.cartsModel.updateOne({_id : idCart},{$push: {products: newProducts}})
            return productosActualizados;
        }
        const productosActualizados = newProducts.forEach(products => {this.actualizacion(idCart, products)})
        return productosActualizados;
    }
    async actualizacion(idCart, products) {
        const productId = products.product;
        const productQuantity = products.quantity;
        const cartsFiltrado = await this.cartsModel.findOne({_id : idCart});
        const productoEncontrado = cartsFiltrado.products.find(e => e.product.toString() === productId)
        if (!productoEncontrado) {
            const productosActualizados = await this.cartsModel.updateOne({_id : idCart},{$push: {products: products}})
            return productosActualizados;
        }
        const productosActualizados = await this.cartsModel.updateOne({_id : idCart, "products.product" : productId},{$set:{"products.$.quantity":productQuantity}});
        return productosActualizados;
    }
    async addProductToCart(user, idCart, idProducto) {
        const producto = await productMng.getProductById(idProducto)
        if(producto.owner === user.email) {
            throw new Error
        }
        let cartFind = await this.cartsModel.findOne({_id : idCart, "products.product" : producto._id});
        if (!cartFind) {
            const productAdded = await this.cartsModel.updateOne({_id : idCart},{$push: {products: {product:producto, quantity:1}}});
            return productAdded;
        }
        const arrayDeProductos = cartFind.products;
        const productoAgregado = arrayDeProductos.filter(e => e.product.toString() === producto._id.toString());
        const cantidad = productoAgregado[0].quantity;
        const cartUpdated = await this.cartsModel.updateOne({_id : idCart , "products.product" : producto._id},{$set:{"products.$.quantity":cantidad+1}})
        return cartUpdated
    }
    async purchase(idCart) {
        const carrito = await this.cartsModel.findOne({_id : idCart});
        const productoFinal = await this.validarYActualizarStock(carrito);
        await ticketService.create(carrito , productoFinal);
    }
    async deleteCart(idCart) {
        const carrito = await this.cartsModel.deleteOne({_id : idCart});
        return carrito
    };
    async validarYActualizarStock(carrito) {
        const products = carrito.products;
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            let productosFinal = [];
            for (const item of products) {
                const producto = await productMng.getProductById(item.product);
            if (!producto) {
                console.log(`Producto con ID ${item.product} no encontrado.`);
                continue;
            }
            if (producto.stock >= item.quantity) {
            producto.stock -= item.quantity;
            await producto.save({session});
            productosFinal.push(item);
            await this.deleteProduct(carrito._id , item.product);
            } else {
            console.log(`Stock insuficiente para ${producto.title}`);
            }
        }
        await session.commitTransaction();
        session.endSession();
        return productosFinal;
        } catch (error) {
        console.error('Error al validar y actualizar el stock:', error);
        await session.abortTransaction();
        session.endSession();
        throw error;
        }
    }
}

