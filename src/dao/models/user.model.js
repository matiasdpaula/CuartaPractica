import mongoose from 'mongoose';

const collection = 'users';

const schema = new mongoose.Schema({
    first_name: String,
    last_name: String,
    email: { 
        type: String,
        unique: true 
    },
    age: Number,
    password: String,
    cart:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'carts',
    },
    role: { 
        type: String,
        default: "user" 
    },
    documents: [{
        name:String,
        reference:String
    }],
    last_connection: {
        type: Date,
        required: false
    }
})

const userModel = mongoose.model(collection, schema);

export default userModel;